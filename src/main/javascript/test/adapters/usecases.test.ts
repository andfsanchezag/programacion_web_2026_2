import { describe, it, expect } from 'vitest';
import { createApp, AppRepositories } from '../../application/app';
import { makeNaturalCustomer, makeBusinessCustomer, makeBankAccount, makeUser, makeCustomer } from '../helpers';
import { SystemRole } from '../../application/domain/valueobjects/SystemRole';
import { AccountStatus } from '../../application/domain/valueobjects/AccountStatus';
import { LoanStatus } from '../../application/domain/valueobjects/LoanStatus';
import { LoanType } from '../../application/domain/valueobjects/LoanType';
import { TransferStatus } from '../../application/domain/valueobjects/TransferStatus';
import { UserStatus } from '../../application/domain/valueobjects/UserStatus';
import { User } from '../../application/domain/models/User';
import { Customer } from '../../application/domain/models/Customer';
import { BankAccount } from '../../application/domain/models/BankAccount';
import { Loan } from '../../application/domain/models/Loan';
import { Transfer } from '../../application/domain/models/Transfer';
import { Operation } from '../../application/domain/models/Operation';
import { AuditLog } from '../../application/domain/models/AuditLog';

/** Stubs en memoria con comportamiento realista por identificador. */
function stubRepositories(): AppRepositories {
  const customers = new Map<string, Customer>();
  const users = new Map<string, User>();
  const accounts = new Map<string, BankAccount>();
  const loans = new Map<string, Loan>();
  const transfers = new Map<string, Transfer>();
  const operations = new Map<string, Operation>();
  const audits = new Map<string, AuditLog>();
  return {
    customers: {
      save: async (c: Customer) => { customers.set(c.identification, c); return c; },
      findByIdentification: async (c: Customer) => customers.get(c.identification) ?? null,
      findByEmail: async (c: Customer) => [...customers.values()].find((v) => v.email === c.email) ?? null,
      existsByIdentification: async (c: Customer) => customers.has(c.identification),
      existsByEmail: async (c: Customer) => [...customers.values()].some((v) => v.email === c.email),
      findAll: async () => [...customers.values()],
      update: async (c: Customer) => { customers.set(c.identification, c); },
    },
    users: {
      save: async (u: User) => { users.set(u.username, u); return u; },
      findByUsername: async (u: User) => users.get(u.username) ?? null,
      findById: async (u: User) => [...users.values()].find((v) => v.userId === u.userId) ?? null,
      existsByUsername: async (u: User) => users.has(u.username),
      update: async (u: User) => { users.set(u.username, u); },
    },
    accounts: {
      save: async (a: BankAccount) => { accounts.set(a.identifier, a); return a; },
      find: async (a: BankAccount) => accounts.get(a.identifier) ?? null,
      exists: async (a: BankAccount) => accounts.has(a.identifier),
      update: async (a: BankAccount) => { accounts.set(a.identifier, a); },
      findAllByOwner: async (o: Customer) => [...accounts.values()].filter((a) => a.owner.identification === o.identification),
    },
    loans: {
      save: async (l: Loan) => { loans.set(l.identifier, l); return l; },
      find: async (l: Loan) => loans.get(l.identifier) ?? null,
      exists: async (l: Loan) => loans.has(l.identifier),
      update: async (l: Loan) => { loans.set(l.identifier, l); },
      findAllByApplicant: async (c: Customer) => [...loans.values()].filter((l) => l.applicant.identification === c.identification),
    },
    transfers: {
      save: async (t: Transfer) => { transfers.set(t.identifier, t); return t; },
      find: async (t: Transfer) => transfers.get(t.identifier) ?? null,
      exists: async (t: Transfer) => transfers.has(t.identifier),
      update: async (t: Transfer) => { transfers.set(t.identifier, t); },
      findAll: async () => [...transfers.values()],
    },
    operations: {
      save: async (o: Operation) => { operations.set(o.operationId, o); return o; },
      find: async (o: Operation) => operations.get(o.operationId) ?? null,
      findByProduct: async (p: { identifier: string }) => [...operations.values()].filter((o) => o.affectedProduct.identifier === p.identifier),
      exists: async (o: Operation) => operations.has(o.operationId),
      findAll: async () => [...operations.values()],
    },
    audits: {
      save: async (a: AuditLog) => { audits.set(a.auditId, a); return a; },
      find: async (a: AuditLog) => audits.get(a.auditId) ?? null,
      findByProduct: async (p: { identifier: string }) => [...audits.values()].filter((a) => a.affectedProduct.identifier === p.identifier),
      exists: async (a: AuditLog) => audits.has(a.auditId),
      findAll: async () => [...audits.values()],
      findPaged: async (filter: { operationType?: string }, page: number, size: number) => {
        const all = [...audits.values()].filter((a) => !filter.operationType || a.operationType.code === filter.operationType);
        return { content: all.slice(page * size, page * size + size), totalElements: all.length, totalPages: 1, page, size };
      },
    },
  } as unknown as AppRepositories;
}

const buildApp = () => createApp({ jwtSecret: 's1', repositories: stubRepositories() });

function naturalActor() {
  const customer = makeNaturalCustomer();
  const user = makeUser(SystemRole.NATURAL_CUSTOMER, customer);
  return { customer, user };
}

describe('Casos de uso por rol (cobertura total)', () => {
  it('PublicAccess: ciclo completo de registro, login y logout', async () => {
    const app = buildApp();
    const customer = makeNaturalCustomer();
    await app.useCases.publicAccess.registerNaturalCustomer(customer);
    const rep = makeNaturalCustomer();
    await app.useCases.publicAccess.registerNaturalCustomer(rep);
    const biz = makeBusinessCustomer();
    expect((await app.useCases.publicAccess.registerBusinessCustomer(biz)).identification)
      .toBe(biz.identification);
    await app.repositories.customers.save(biz);
    const user = new User('u-p', customer.identification, customer.name, customer.email,
      customer.phone, customer.address, SystemRole.NATURAL_CUSTOMER, 'pubuser',
      'StrongPassword123!', UserStatus.ACTIVE, customer);
    await app.useCases.publicAccess.registerCustomerUser(user);
    const logged = await app.useCases.publicAccess.login(
      (() => { const u = User.forUsernameLookup('pubuser'); u.replacePassword('StrongPassword123!'); return u; })());
    expect(logged.username).toBe('pubuser');
    expect(logged.token.split('.')).toHaveLength(3);
    await app.useCases.publicAccess.logout(user);
  });

  it('NaturalCustomer: perfil, productos, préstamo, pago, transferencia y operaciones', async () => {
    const app = buildApp();
    const { customer, user } = naturalActor();
    await app.repositories.customers.save(customer);
    const acc = makeBankAccount(customer, AccountStatus.ACTIVE, 10000);
    const acc2 = makeBankAccount(customer, AccountStatus.ACTIVE, 0);
    await app.repositories.accounts.save(acc);
    await app.repositories.accounts.save(acc2);

    expect(await app.useCases.natural.consultMyProfile(user)).toBe(customer);
    customer.updateContactInformation('n@x.com', customer.phone, customer.address);
    expect((await app.useCases.natural.updateMyProfile(user, customer)).email).toBe('n@x.com');
    expect((await app.useCases.natural.consultMyProducts(user)).length).toBeGreaterThanOrEqual(2);
    expect((await app.useCases.natural.consultMyAccounts(user)).length).toBe(2);
    expect(await app.useCases.natural.consultAccountBalance(user, acc)).toBe(10000);

    const loan = new Loan('LN-U', customer, LoanType.PERSONAL, 1000, 0.1, 12, acc);
    await app.useCases.natural.requestLoan(user, customer, loan);
    expect((await app.useCases.natural.consultLoan(user, loan)).identifier).toBe('LN-U');
    loan.approve(1000, new Date());
    loan.disburse(new Date());
    await app.repositories.loans.update(loan);
    expect((await app.useCases.natural.registerLoanPayment(user, loan)).loanStatus).toBe(LoanStatus.DISBURSED);

    const t = new Transfer('TR-U', acc, acc2, 500, new Date(), user);
    const created = await app.useCases.natural.createTransfer(user, t);
    expect(created.transferStatus).toBe(TransferStatus.APPROVED);
    const executed = await app.useCases.natural.executeTransfer(user, created);
    expect(executed.transferStatus).toBe(TransferStatus.EXECUTED);
    expect(acc.currentBalance).toBe(9500);
    expect(acc2.currentBalance).toBe(500);
    expect(Array.isArray(await app.useCases.natural.consultMyOperations(user, acc))).toBe(true);
  });

  it('BusinessCustomer: perfil, productos, cuentas, préstamo, usuario y transfers', async () => {
    const app = buildApp();
    const company = makeBusinessCustomer();
    await app.repositories.customers.save(company);
    const actor = new User('u-biz', company.identification, company.name, company.email,
      company.phone, company.address, SystemRole.BUSINESS_CUSTOMER, 'bizactor',
      'StrongPassword123!', UserStatus.ACTIVE, company);
    await app.repositories.users.save(actor);

    expect(await app.useCases.businessCustomer.consultCompanyProfile(actor)).toBe(company);
    expect(Array.isArray(await app.useCases.businessCustomer.consultCompanyProducts(actor))).toBe(true);
    const acc = makeBankAccount(company, AccountStatus.ACTIVE, 50000);
    await app.repositories.accounts.save(acc);
    expect((await app.useCases.businessCustomer.consultCompanyAccounts(actor)).length).toBe(1);

    const loan = new Loan('LN-B', company, LoanType.PERSONAL, 2000, 0.1, 12, acc);
    expect((await app.useCases.businessCustomer.requestCompanyLoan(actor, company, loan)).identifier).toBe('LN-B');
    const op = new User('u-op', 'op-id', 'Op', 'op@x.com', '', '',
      SystemRole.BUSINESS_OPERATOR, 'opx', 'StrongPassword123!', UserStatus.ACTIVE, company);
    const createdOp = await app.useCases.businessCustomer.registerCompanyUser(actor, op);
    expect(createdOp.username).toBe('opx');

    const w = new Transfer('TR-BW', acc, makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0), 100, new Date(), actor);
    w.submitForApproval();
    await app.repositories.transfers.save(w);
    expect((await app.useCases.businessCustomer.approveCompanyTransfer(actor, w)).transferStatus).toBe(TransferStatus.APPROVED);
    const w2 = new Transfer('TR-BW2', acc, makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0), 100, new Date(), actor);
    w2.submitForApproval();
    await app.repositories.transfers.save(w2);
    expect((await app.useCases.businessCustomer.rejectCompanyTransfer(actor, w2)).transferStatus).toBe(TransferStatus.REJECTED);
  });

  it('BusinessOperator: cuentas, creación, envío a aprobación y operaciones', async () => {
    const app = buildApp();
    const company = makeBusinessCustomer();
    await app.repositories.customers.save(company);
    const actor = new User('u-bop', company.identification, company.name, company.email,
      company.phone, company.address, SystemRole.BUSINESS_OPERATOR, 'bizop',
      'StrongPassword123!', UserStatus.ACTIVE, company);
    const acc = makeBankAccount(company, AccountStatus.ACTIVE, 100000);
    await app.repositories.accounts.save(acc);
    expect((await app.useCases.businessOperator.consultCompanyAccounts(actor)).length).toBe(1);
    const t = new Transfer('TR-O', acc, makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0), 100, new Date(), actor);
    const created = await app.useCases.businessOperator.createCompanyTransfer(actor, t);
    expect(created.transferStatus).toBe(TransferStatus.APPROVED);
    const big = new Transfer('TR-OB', acc, makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0), 100, new Date(), actor);
    await app.repositories.transfers.save(big);
    expect((await app.useCases.businessOperator.submitTransferForApproval(actor, big)).transferStatus)
      .toBe(TransferStatus.WAITING_FOR_APPROVAL);
    expect(Array.isArray(await app.useCases.businessOperator.consultCompanyOperations(actor, acc))).toBe(true);
  });

  it('BusinessSupervisor: pendientes, approve, reject y operaciones', async () => {
    const app = buildApp();
    const sup = makeUser(SystemRole.BUSINESS_SUPERVISOR);
    const owner = makeCustomer();
    await app.repositories.customers.save(owner);
    const acc = makeBankAccount(owner, AccountStatus.ACTIVE, 100000);
    await app.repositories.accounts.save(acc);
    const mkWaiting = async (id: string) => {
      const t = new Transfer(id, acc, makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0), 50000, new Date(), sup);
      t.submitForApproval();
      await app.repositories.transfers.save(t);
      return t;
    };
    const t1 = await mkWaiting('TR-S1');
    await mkWaiting('TR-S2');
    const pending = await app.useCases.businessSupervisor.consultPendingTransfers(sup);
    expect(pending.length).toBe(2);
    expect((await app.useCases.businessSupervisor.approveTransfer(sup, t1)).transferStatus).toBe(TransferStatus.APPROVED);
    const t2 = (await app.repositories.transfers.find({ identifier: 'TR-S2' } as Transfer)) as Transfer;
    expect((await app.useCases.businessSupervisor.rejectTransfer(sup, t2)).transferStatus).toBe(TransferStatus.REJECTED);
    expect(Array.isArray(await app.useCases.businessSupervisor.consultCompanyOperations(sup, acc))).toBe(true);
  });

  it('Teller: ciclo completo de ventanilla', async () => {
    const app = buildApp();
    const teller = makeUser(SystemRole.TELLER_EMPLOYEE);
    const customer = makeNaturalCustomer();
    await app.repositories.customers.save(customer);
    expect(await app.useCases.teller.consultCustomer(teller, customer)).toBe(customer);
    const acc = makeBankAccount(customer, AccountStatus.ACTIVE, 0);
    expect((await app.useCases.teller.openBankAccount(teller, acc)).identifier).toBe(acc.identifier);
    expect(await app.useCases.teller.consultBankAccount(teller, acc)).toBe(acc);
    expect(await app.useCases.teller.consultAccountBalance(teller, acc)).toBe(0);
    expect((await app.useCases.teller.depositFunds(teller, acc, 1000)).currentBalance).toBe(1000);
    expect((await app.useCases.teller.withdrawFunds(teller, acc, 400)).currentBalance).toBe(600);
    expect((await app.useCases.teller.blockBankAccount(teller, acc)).accountStatus).toBe(AccountStatus.BLOCKED);
    expect((await app.useCases.teller.unblockBankAccount(teller, acc)).accountStatus).toBe(AccountStatus.ACTIVE);
    await app.useCases.teller.withdrawFunds(teller, acc, 600);
    expect((await app.useCases.teller.closeBankAccount(teller, acc)).accountStatus).toBe(AccountStatus.CLOSED);
  });

  it('Commercial: consulta, actualización, productos, préstamo y estado', async () => {
    const app = buildApp();
    const commercial = makeUser(SystemRole.COMMERCIAL_EMPLOYEE);
    const customer = makeNaturalCustomer();
    await app.repositories.customers.save(customer);
    expect(await app.useCases.commercial.consultCustomer(commercial, customer)).toBe(customer);
    customer.updateContactInformation('c@x.com', customer.phone, customer.address);
    expect((await app.useCases.commercial.updateCustomer(commercial, customer)).email).toBe('c@x.com');
    const acc = makeBankAccount(customer, AccountStatus.ACTIVE, 0);
    await app.repositories.accounts.save(acc);
    expect((await app.useCases.commercial.consultCustomerProducts(commercial, customer)).length).toBeGreaterThanOrEqual(1);
    const loan = new Loan('LN-M', customer, LoanType.PERSONAL, 1500, 0.1, 12, acc);
    expect((await app.useCases.commercial.requestLoanOnBehalfOfCustomer(commercial, customer, loan)).identifier).toBe('LN-M');
    expect((await app.useCases.commercial.consultLoanStatus(commercial, loan)).identifier).toBe('LN-M');
    const acc2 = makeBankAccount(customer, AccountStatus.ACTIVE, 0);
    expect((await app.useCases.commercial.openBankAccount(commercial, acc2)).identifier).toBe(acc2.identifier);
  });

  it('InternalAnalyst: empleados, estados, ciclo de préstamo y auditoría', async () => {
    const app = buildApp();
    const analyst = makeUser(SystemRole.INTERNAL_ANALYST);
    const emp = new User('u-emp', 'emp-id', 'Emp', 'emp@x.com', '', '',
      SystemRole.TELLER_EMPLOYEE, 'tellerx', 'StrongPassword123!', UserStatus.ACTIVE, null);
    expect((await app.useCases.analyst.registerEmployeeUser(analyst, emp)).username).toBe('tellerx');
    const customer = makeNaturalCustomer();
    await app.repositories.customers.save(customer);
    const acc = makeBankAccount(customer, AccountStatus.ACTIVE, 0);
    await app.repositories.accounts.save(acc);
    const loan = new Loan('LN-A', customer, LoanType.PERSONAL, 1000, 0.1, 12, acc);
    await app.repositories.loans.save(loan);
    expect((await app.useCases.analyst.approveLoan(analyst, loan)).loanStatus).toBe(LoanStatus.APPROVED);
    expect((await app.useCases.analyst.disburseLoan(analyst, loan)).loanStatus).toBe(LoanStatus.DISBURSED);
    const loan2 = new Loan('LN-A2', customer, LoanType.PERSONAL, 500, 0.1, 6, acc);
    await app.repositories.loans.save(loan2);
    expect((await app.useCases.analyst.rejectLoan(analyst, loan2)).loanStatus).toBeDefined();
    customer.block();
    expect((await app.useCases.analyst.changeCustomerStatus(analyst, customer)).status).toBeDefined();
    const target = makeUser(SystemRole.TELLER_EMPLOYEE);
    await app.repositories.users.save(target);
    expect((await app.useCases.analyst.changeUserStatus(analyst, target)).username).toBe(target.username);
    expect(Array.isArray(await app.useCases.analyst.consultAuditLog(analyst, acc))).toBe(true);
    expect(Array.isArray(await app.useCases.analyst.consultAuditLog(analyst, acc))).toBe(true);
    expect(Array.isArray(await app.useCases.analyst.consultAllOperations(analyst, acc))).toBe(true);
  });
});
