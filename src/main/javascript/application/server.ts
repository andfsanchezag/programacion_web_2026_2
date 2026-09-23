import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { createApp, App } from './app';
import { bootstrapPersistence } from './infrastructure/database/bootstrap';
import { appConfig } from './infrastructure/config/appConfig';
import { User } from './domain/models/User';
import { Customer } from './domain/models/Customer';
import { NaturalCustomer } from './domain/models/NaturalCustomer';
import { BankAccount } from './domain/models/BankAccount';
import { Loan } from './domain/models/Loan';
import { Transfer } from './domain/models/Transfer';
import { SystemRole } from './domain/valueobjects/SystemRole';
import { CustomerStatus } from './domain/valueobjects/CustomerStatus';
import { UserStatus } from './domain/valueobjects/UserStatus';
import { AccountType } from './domain/valueobjects/AccountType';
import { AccountStatus } from './domain/valueobjects/AccountStatus';
import { Currency } from './domain/valueobjects/Currency';
import { TransferStatus } from './domain/valueobjects/TransferStatus';
import { LoanType } from './domain/valueobjects/LoanType';
import { AuthRestMapper, BankAccountRestMapper, LoanRestMapper, TransferRestMapper, OperationRestMapper } from './adapters/rest/mappers/rest.mappers';
import { requestIdMiddleware, globalErrorHandler } from './adapters/rest/middleware/errorHandler';

const genId = (p: string): string => `${p}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

/** Envoltorio `{status, body}` de los controladores REST (códigos HTTP del contrato). */
function isEnvelope(out: unknown): out is { status: number; body: unknown } {
  return typeof out === 'object' && out !== null
    && typeof (out as { status?: unknown }).status === 'number'
    && 'body' in out;
}

/** Referencia NaturalCustomer válida para búsquedas por modelo (los servicios re-resuelven el estado autoritativo en DB). */
function lookupCustomer(identification: string): NaturalCustomer {
  return new NaturalCustomer(
    `lookup-${identification}`, identification, identification,
    `${identification}@lookup.local`, '0000000000', 'N/A',
    SystemRole.NATURAL_CUSTOMER, CustomerStatus.ACTIVE, new Date(), identification,
  );
}
function ownerOf(user: User): Customer {
  return user.customer ?? lookupCustomer(user.identification);
}
function refAccount(accountNumber: string, owner: Customer): BankAccount {
  return new BankAccount(accountNumber, AccountType.SAVINGS, owner, Currency.COP, new Date(), 0, AccountStatus.ACTIVE);
}
function refTransfer(transferId: string, by: User): Transfer {
  const owner = ownerOf(by);
  return new Transfer(transferId, refAccount(`src-${transferId}`, owner), refAccount(`dst-${transferId}`, owner), 1, new Date(), by);
}
function refLoan(loanId: string, applicant: Customer, dest: BankAccount): Loan {
  return new Loan(loanId, applicant, LoanType.PERSONAL, 1, 0, 1, dest);
}

async function main(): Promise<void> {
  const { adapters, close } = await bootstrapPersistence();
  const app: App = createApp({
    jwtSecret: process.env.JWT_SECRET, jwtExpiresIn: Number(process.env.JWT_EXPIRES_IN ?? 3600),
    approvalThreshold: Number(process.env.TRANSFER_APPROVAL_THRESHOLD ?? 10000000),
    approvalExpirationHours: Number(process.env.TRANSFER_APPROVAL_EXPIRATION_HOURS ?? 24),
    repositories: adapters,
  });

  const server = express();
  server.use(express.json());
  server.use(requestIdMiddleware);
  server.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  const authed = (req: Request): User => (req as unknown as { user: User }).user;
  const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const jwtUser = app.middleware.authenticate(req as never);
      // Enriquecer con el usuario persistido en MySQL (customer + status reales para las reglas).
      const stored = await app.repositories.users.findByUsername(User.forUsernameLookup(jwtUser.username));
      (req as unknown as { user: User }).user = stored ?? jwtUser;
      next();
    } catch (e) {
      next(e);
    }
  };
  const requireRole = (...roles: SystemRole[]) => (req: Request, res: Response, next: NextFunction): void => {
    try {
      app.middleware.authorize(authed(req), ...roles);
      next();
    } catch (e) {
      next(e);
    }
  };
  const run = (fn: (req: Request, res: Response) => unknown) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const out = await fn(req, res);
      if (res.headersSent) return;
      // Los controladores devuelven `{status, body}` (§5.6 contrato REST);
      // el resto de valores se serializan con 200 OK.
      if (isEnvelope(out)) {
        if (out.status === 204 || out.body === undefined) {
          res.status(out.status).send();
          return;
        }
        res.status(out.status).json(out.body);
        return;
      }
      res.json(out);
    } catch (e) {
      next(e);
    }
  };
  const resolveAccount = (user: User, n: string): Promise<BankAccount> =>
    app.services.accountService.consult(user, refAccount(n, ownerOf(user)));
  const resolveTransfer = (user: User, id: string): Promise<Transfer> =>
    app.services.transferService.consultTransfer(user, refTransfer(id, user));
  const resolveLoan = (user: User, id: string, applicant?: Customer, dest?: BankAccount): Promise<Loan> =>
    app.services.loanService.consultLoan(user, refLoan(id, applicant ?? ownerOf(user), dest ?? refAccount(`dst-${id}`, applicant ?? ownerOf(user))));

  server.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'UP', persistence: 'mysql+mongo' });
  });

  // ---------- Público ----------
  server.post('/api/v1/auth/login', run(async (req) => (await app.controllers.auth.login(req.body))));
  server.post('/api/v1/auth/logout', requireAuth, run(async (req) => {
    await app.useCases.publicAccess.logout(authed(req));
    return { status: 204 as const, body: undefined };
  }));
  server.post('/api/v1/auth/register/natural-customer', run(async (req) =>
    app.controllers.auth.registerNatural(req.body)));
  server.post('/api/v1/auth/register/business-customer', run(async (req) => {
    const rep = await app.repositories.customers.findByIdentification(lookupCustomer(req.body.legalRepresentativeIdentification));
    if (!(rep instanceof NaturalCustomer)) throw Object.assign(new Error('Legal representative not found'), { status: 404 });
    return (await app.controllers.auth.registerBusiness(req.body, rep));
  }));
  server.post('/api/v1/auth/register/user', run(async (req) => {
    const customer = await app.repositories.customers.findByIdentification(lookupCustomer(req.body.customerIdentification));
    if (!customer) throw Object.assign(new Error('Customer not found'), { status: 404 });
    return (await app.controllers.auth.registerUser(req.body, customer));
  }));

  // ---------- Natural customer ----------
  const natural = requireRole(SystemRole.NATURAL_CUSTOMER);
  server.get('/api/v1/natural-customer/profile', requireAuth, natural, run(async (req) =>
    (await app.controllers.natural.getProfile(authed(req)))));
  server.put('/api/v1/natural-customer/profile', requireAuth, natural, run(async (req) => {
    const user = authed(req);
    const current = await app.useCases.natural.consultMyProfile(user);
    const dto = req.body as { email?: string; phoneNumber?: string; address?: string };
    current.updateContactInformation(dto.email ?? current.email, dto.phoneNumber ?? current.phone, dto.address ?? current.address);
    return (await app.controllers.natural.updateProfile(user, current, dto));
  }));
  server.get('/api/v1/natural-customer/accounts', requireAuth, natural, run(async (req) =>
    (await app.controllers.natural.getAccounts(authed(req)))));
  server.get('/api/v1/natural-customer/accounts/:n/balance', requireAuth, natural, run(async (req) => {
    const user = authed(req);
    const account = await resolveAccount(user, req.params.n);
    return (await app.controllers.natural.getBalance(user, account));
  }));
  server.post('/api/v1/natural-customer/loans', requireAuth, natural, run(async (req) => {
    const user = authed(req);
    if (!user.customer) throw Object.assign(new Error('User without customer'), { status: 403 });
    const dest = await resolveAccount(user, req.body.destinationAccountNumber);
    const loan = LoanRestMapper.requestToDomain(req.body, user.customer, dest, genId('LOAN'));
    return (await app.controllers.natural.requestLoan(user, user.customer, loan));
  }));
  server.get('/api/v1/natural-customer/loans/:id', requireAuth, natural, run(async (req) => {
    const user = authed(req);
    const loan = await resolveLoan(user, req.params.id);
    return LoanRestMapper.toResponse(loan);
  }));
  server.post('/api/v1/natural-customer/loans/:id/payments', requireAuth, natural, run(async (req) => {
    const user = authed(req);
    const updated = await app.useCases.natural.registerLoanPayment(user, await resolveLoan(user, req.params.id));
    return LoanRestMapper.toResponse(updated);
  }));
  server.post('/api/v1/natural-customer/transfers', requireAuth, natural, run(async (req) => {
    const user = authed(req);
    const src = await resolveAccount(user, req.body.sourceAccountNumber);
    const dst = await resolveAccount(user, req.body.destinationAccountNumber);
    const created = await app.useCases.natural.createTransfer(user, TransferRestMapper.createToDomain(req.body, src, dst, user, genId('TRF')));
    // Contrato §4.8 Create & Execute: bajo el umbral se ejecuta de inmediato
    // (201 EXECUTED); con aprobación requerida conserva WAITING_FOR_APPROVAL y
    // la transición posterior la exponen los flujos de aprobación (§7).
    if (created.transferStatus.code === TransferStatus.WAITING_FOR_APPROVAL.code) {
      return { status: 201 as const, body: TransferRestMapper.toResponse(created) };
    }
    const executed = await app.useCases.natural.executeTransfer(user, created);
    return { status: 201 as const, body: TransferRestMapper.toResponse(executed) };
  }));
  server.get('/api/v1/natural-customer/operations', requireAuth, natural, run(async (req) => {
    const user = authed(req);
    const product = await resolveAccount(user, String(req.query.accountNumber ?? ''));
    return (await app.controllers.natural.getOperations(user, product));
  }));

  // ---------- Business customer ----------
  const biz = requireRole(SystemRole.BUSINESS_CUSTOMER);
  server.get('/api/v1/business-customer/profile', requireAuth, biz, run(async (req) =>
    AuthRestMapper.toCustomerResponse(await app.useCases.businessCustomer.consultCompanyProfile(authed(req)))));
  server.post('/api/v1/business-customer/users', requireAuth, biz, run(async (req) => {
    const user = authed(req);
    const domain = new User(genId('usr'), req.body.identification, req.body.name, req.body.email,
      '', '', SystemRole.fromCode(req.body.role), req.body.username, req.body.password,
      UserStatus.ACTIVE, user.customer);
    return (await app.controllers.businessCustomer.registerCompanyUser(user, domain));
  }));
  server.patch('/api/v1/business-customer/transfers/:id/approve', requireAuth, biz, run(async (req) => {
    const user = authed(req);
    return (await app.controllers.businessCustomer.approveTransfer(user, await resolveTransfer(user, req.params.id)));
  }));
  server.patch('/api/v1/business-customer/transfers/:id/reject', requireAuth, biz, run(async (req) => {
    const user = authed(req);
    return (await app.controllers.businessCustomer.rejectTransfer(user, await resolveTransfer(user, req.params.id)));
  }));

  // ---------- Business operator ----------
  const op = requireRole(SystemRole.BUSINESS_OPERATOR);
  server.get('/api/v1/business-operator/accounts', requireAuth, op, run(async (req) =>
    (await app.useCases.businessOperator.consultCompanyAccounts(authed(req))).map(BankAccountRestMapper.toResponse)));
  server.post('/api/v1/business-operator/transfers', requireAuth, op, run(async (req) => {
    const user = authed(req);
    const src = await resolveAccount(user, req.body.sourceAccountNumber);
    const dst = await resolveAccount(user, req.body.destinationAccountNumber);
    return (await app.controllers.businessOperator.createTransfer(user, TransferRestMapper.createToDomain(req.body, src, dst, user, genId('TRF'))));
  }));

  // ---------- Business supervisor ----------
  const sup = requireRole(SystemRole.BUSINESS_SUPERVISOR);
  server.get('/api/v1/business-supervisor/transfers/pending', requireAuth, sup, run(async (req) =>
    (await app.useCases.businessSupervisor.consultPendingTransfers(authed(req))).map(TransferRestMapper.toResponse)));
  server.patch('/api/v1/business-supervisor/transfers/:id/approve', requireAuth, sup, run(async (req) => {
    const user = authed(req);
    return (await app.controllers.businessSupervisor.approve(user, await resolveTransfer(user, req.params.id)));
  }));
  server.patch('/api/v1/business-supervisor/transfers/:id/reject', requireAuth, sup, run(async (req) => {
    const user = authed(req);
    return TransferRestMapper.toResponse(await app.useCases.businessSupervisor.rejectTransfer(user, await resolveTransfer(user, req.params.id)));
  }));

  // ---------- Teller ----------
  const teller = requireRole(SystemRole.TELLER_EMPLOYEE);
  server.get('/api/v1/teller/customers', requireAuth, teller, run(async (req) => {
    const found = await app.repositories.customers.findByIdentification(lookupCustomer(String(req.query.identification ?? '')));
    if (!found) throw Object.assign(new Error('Customer not found'), { status: 404 });
    return AuthRestMapper.toCustomerResponse(await app.useCases.teller.consultCustomer(authed(req), found));
  }));
  server.post('/api/v1/teller/accounts', requireAuth, teller, run(async (req) => {
    const owner = await app.repositories.customers.findByIdentification(lookupCustomer(req.body.ownerIdentification));
    if (!owner) throw Object.assign(new Error('Owner customer not found'), { status: 404 });
    const account = BankAccountRestMapper.openToDomain(req.body.accountNumber ?? genId('CTA'), req.body.accountType ?? 'SAVINGS', owner, req.body.currency ?? 'COP');
    return BankAccountRestMapper.toResponse(await app.useCases.teller.openBankAccount(authed(req), account));
  }));
  server.get('/api/v1/teller/accounts/:n', requireAuth, teller, run(async (req) =>
    BankAccountRestMapper.toResponse(await app.useCases.teller.consultBankAccount(authed(req), refAccount(req.params.n, ownerOf(authed(req)))))));
  server.post('/api/v1/teller/accounts/:n/deposits', requireAuth, teller, run(async (req) => {
    const user = authed(req);
    return (await app.controllers.teller.deposit(user, await resolveAccount(user, req.params.n), req.body));
  }));
  server.post('/api/v1/teller/accounts/:n/withdrawals', requireAuth, teller, run(async (req) => {
    const user = authed(req);
    return (await app.controllers.teller.withdraw(user, await resolveAccount(user, req.params.n), req.body));
  }));
  server.patch('/api/v1/teller/accounts/:n/block', requireAuth, teller, run(async (req) => {
    const user = authed(req);
    return (await app.controllers.teller.block(user, await resolveAccount(user, req.params.n)));
  }));
  server.patch('/api/v1/teller/accounts/:n/unblock', requireAuth, teller, run(async (req) => {
    const user = authed(req);
    return BankAccountRestMapper.toResponse(await app.useCases.teller.unblockBankAccount(user, await resolveAccount(user, req.params.n)));
  }));
  server.patch('/api/v1/teller/accounts/:n/close', requireAuth, teller, run(async (req) => {
    const user = authed(req);
    return BankAccountRestMapper.toResponse(await app.useCases.teller.closeBankAccount(user, await resolveAccount(user, req.params.n)));
  }));

  // ---------- Commercial ----------
  const commercial = requireRole(SystemRole.COMMERCIAL_EMPLOYEE);
  server.post('/api/v1/commercial/loans', requireAuth, commercial, run(async (req) => {
    const user = authed(req);
    const customer = await app.repositories.customers.findByIdentification(lookupCustomer(req.body.customerIdentification));
    if (!customer) throw Object.assign(new Error('Customer not found'), { status: 404 });
    const dest = await resolveAccount(user, req.body.destinationAccountNumber);
    return (await app.controllers.commercial.requestLoan(user, customer, LoanRestMapper.requestToDomain(req.body, customer, dest, genId('LOAN'))));
  }));

  // ---------- Internal analyst ----------
  const analyst = requireRole(SystemRole.INTERNAL_ANALYST);
  server.post('/api/v1/internal-analyst/users/employee', requireAuth, analyst, run(async (req) => {
    const domain = new User(genId('usr'), req.body.identification, req.body.name, req.body.email,
      '', '', SystemRole.fromCode(req.body.role), req.body.username, req.body.password,
      UserStatus.ACTIVE, null);
    return { status: 201 as const,
      body: AuthRestMapper.toUserResponse(await app.useCases.analyst.registerEmployeeUser(authed(req), domain)) };
  }));
  server.patch('/api/v1/internal-analyst/customers/:id/status', requireAuth, analyst, run(async (req) => {
    const user = authed(req);
    const customer = await app.repositories.customers.findByIdentification(lookupCustomer(req.params.id));
    if (!customer) throw Object.assign(new Error('Customer not found'), { status: 404 });
    const target = String(req.body.status);
    if (target === CustomerStatus.BLOCKED.code) customer.block();
    else if (target === CustomerStatus.ACTIVE.code) customer.activate();
    else if (target === CustomerStatus.INACTIVE.code) customer.deactivate();
    else throw Object.assign(new Error(`Unsupported status ${target}`), { status: 400 });
    return (await app.controllers.analyst.changeCustomerStatus(user, customer, req.body));
  }));
  server.patch('/api/v1/internal-analyst/loans/:id/approve', requireAuth, analyst, run(async (req) => {
    const user = authed(req);
    const current = await resolveLoan(user, req.params.id);
    const input = new Loan(current.identifier, current.applicant, current.loanType,
      current.requestedAmount, req.body.interestRate ?? current.interestRate,
      current.termInMonths, current.destinationAccount, req.body.approvedAmount ?? current.requestedAmount,
      current.loanStatus, null, null);
    return (await app.controllers.analyst.approveLoan(user, input, req.body));
  }));
  server.patch('/api/v1/internal-analyst/loans/:id/reject', requireAuth, analyst, run(async (req) => {
    const user = authed(req);
    return LoanRestMapper.toResponse(await app.useCases.analyst.rejectLoan(user, await resolveLoan(user, req.params.id)));
  }));
  server.post('/api/v1/internal-analyst/loans/:id/disburse', requireAuth, analyst, run(async (req) => {
    const user = authed(req);
    return (await app.controllers.analyst.disburseLoan(user, await resolveLoan(user, req.params.id)));
  }));
  server.get('/api/v1/internal-analyst/audit-logs', requireAuth, analyst, run(async (req) => {
    const user = authed(req);
    // Contrato §10.5: filtros userId/operationType/cuenta + paginación page/size.
    const q = req.query as { accountNumber?: string; operationType?: string; userId?: string; page?: string; size?: string };
    const size = Math.max(1, Number(q.size ?? 20) || 20);
    const page = Math.max(0, Number(q.page ?? 0) || 0);
    if (q.accountNumber) {
      // Por cuenta se consulta vía caso de uso (autorización de dominio).
      const logs = await app.useCases.analyst.consultAuditLog(user, await resolveAccount(user, q.accountNumber));
      const filtered = logs.filter((l) =>
        (!q.operationType || l.operationType.code === q.operationType) &&
        (!q.userId || l.performedBy.userId === q.userId || l.performedBy.username === q.userId));
      const totalElements = filtered.length;
      const content = filtered
        .slice(page * size, page * size + size)
        .map(OperationRestMapper.auditToResponse);
      return { status: 200 as const, body: {
        content, totalElements, totalPages: Math.max(1, Math.ceil(totalElements / size)),
      } };
    }
    // Listado general con filtros y paginación resueltos en MongoDB.
    const paged = await app.repositories.audits.findPaged(
      { operationType: q.operationType, performedBy: q.userId }, page, size);
    return { status: 200 as const, body: {
      content: paged.content.map(OperationRestMapper.auditToResponse),
      totalElements: paged.totalElements,
      totalPages: paged.totalPages,
    } };
  }));
  server.delete('/api/v1/internal-analyst/loans/:id', requireAuth, analyst, run(async (req, res) => {
    const user = authed(req);
    // Contrato §10.6: consultar el recurso (404 si no existe) y ejecutar el
    // cierre de dominio (autorización, transición a CLOSED, Operation + AuditLog).
    await app.useCases.analyst.closeLoan(user, await resolveLoan(user, req.params.id));
    res.status(204).send();
  }));

  // Handler global de errores (contrato SDD/Adapters/Global-exception-handler.md).
  // Rutas no registradas: 404 con la forma uniforme de error.
  server.use((req: Request, _res: Response, next: NextFunction) => {
    next(Object.assign(new Error(`Route not found: ${req.method} ${req.path}`), { status: 404 }));
  });
  server.use(globalErrorHandler);

  const port = appConfig.port;
  const http = server.listen(port, () => {
    console.log(`[server] Banking API escuchando en :${port} (persistencia: mysql+mongo)`);
  });
  const shutdown = async (): Promise<void> => {
    http.close();
    await close();
    process.exit(0);
  };
  process.on('SIGINT', () => { void shutdown(); });
  process.on('SIGTERM', () => { void shutdown(); });
}

main().catch((e: unknown) => {
  console.error('[server] arranque fallido (MySQL 3306 y Mongo 27017 requeridos):', (e as Error).message);
  process.exit(1);
});
