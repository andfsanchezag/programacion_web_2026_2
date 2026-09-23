import { describe, it, expect, vi } from 'vitest';
import {
  AuthController, NaturalCustomerController, BusinessCustomerController,
  BusinessOperatorController, BusinessSupervisorController, TellerController,
  CommercialController, InternalAnalystController,
} from '../../application/adapters/rest/controllers/controllers';
import { Transfer } from '../../application/domain/models/Transfer';
import { Loan } from '../../application/domain/models/Loan';
import { Operation } from '../../application/domain/models/Operation';
import { AuditLog } from '../../application/domain/models/AuditLog';
import { TransferStatus } from '../../application/domain/valueobjects/TransferStatus';
import { AccountStatus } from '../../application/domain/valueobjects/AccountStatus';
import { LoanType } from '../../application/domain/valueobjects/LoanType';
import { OperationType } from '../../application/domain/valueobjects/OperationType';
import { SystemRole } from '../../application/domain/valueobjects/SystemRole';
import { makeNaturalCustomer, makeCustomer, makeBusinessCustomer, makeUser, makeBankAccount, NOW } from '../helpers';

function mockPort<T extends object>(methods: Partial<Record<string, unknown>>): T {
  const stub: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(methods)) stub[k] = v;
  return new Proxy(stub, {
    get: (t, p) => (p in t ? t[p as string] : vi.fn(async (...a: unknown[]) => a[a.length - 1] ?? null)),
  }) as T;
}

function transferFixture() {
  const owner = makeCustomer();
  const src = makeBankAccount(owner, AccountStatus.ACTIVE, 1000);
  const dst = makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0);
  const by = makeUser(SystemRole.NATURAL_CUSTOMER, owner);
  return { owner, src, dst, by, transfer: new Transfer('TR-C', src, dst, 100, NOW, by) };
}

function loanFixture() {
  const applicant = makeCustomer();
  const dest = makeBankAccount(applicant, AccountStatus.ACTIVE, 0);
  return { applicant, dest, loan: new Loan('LN-C', applicant, LoanType.PERSONAL, 1000, 0.1, 12, dest) };
}

describe('REST controllers (puertos simulados)', () => {
  it('Auth: login 200, logout 204, registros 201', async () => {
    const user = makeUser();
    const port = mockPort<{ login: unknown; logout: unknown; registerNaturalCustomer: unknown; registerBusinessCustomer: unknown; registerCustomerUser: unknown }>({
      login: vi.fn(async () => ({ token: 't', username: user.username, role: user.role })),
      logout: vi.fn(async () => {}),
      registerNaturalCustomer: vi.fn(async (c: unknown) => c),
      registerBusinessCustomer: vi.fn(async (c: unknown) => c),
      registerCustomerUser: vi.fn(async (u: unknown) => u),
    });
    const c = new AuthController(port as never);
    const login = await c.login({ username: user.username, password: 'pw' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBe('t');
    expect(await c.logout(user)).toMatchObject({ status: 204 });
    const nat = await c.registerNatural({ identification: '1', name: 'N', email: 'n@x.com', phoneNumber: '1', address: 'a', birthDate: '2000-01-01' });
    expect(nat.status).toBe(201);
    const rep = makeNaturalCustomer();
    expect((await c.registerBusiness({ identification: '9', name: 'B', email: 'b@x.com', phoneNumber: '2', address: 'b', legalRepresentativeIdentification: rep.identification }, rep)).status).toBe(201);
    expect((await c.registerUser({ customerIdentification: '1', username: 'u', password: 'p', role: 'NATURAL_CUSTOMER' }, makeCustomer())).status).toBe(201);
  });

  it('NaturalCustomer: perfil, cuentas, balance, préstamo, transferencia, operaciones', async () => {
    const customer = makeCustomer();
    const user = makeUser(SystemRole.NATURAL_CUSTOMER, customer);
    const account = makeBankAccount(customer, AccountStatus.ACTIVE, 500);
    const { loan } = loanFixture();
    const { transfer } = transferFixture();
    const port = mockPort<{ [k: string]: unknown }>({
      consultMyProfile: vi.fn(async () => customer),
      updateMyProfile: vi.fn(async () => customer),
      consultMyAccounts: vi.fn(async () => [account]),
      consultAccountBalance: vi.fn(async () => 500),
      requestLoan: vi.fn(async () => loan),
      createTransfer: vi.fn(async () => transfer),
      consultMyOperations: vi.fn(async () => []),
    });
    const c = new NaturalCustomerController(port as never);
    expect((await c.getProfile(user)).status).toBe(200);
    expect((await c.updateProfile(user, customer, { email: 'n@x.com' })).status).toBe(200);
    expect((await c.getAccounts(user)).body.length).toBe(1);
    expect((await c.getBalance(user, account)).body).toMatchObject({ availableBalance: 500 });
    expect((await c.requestLoan(user, customer, loan)).status).toBe(201);
    const created = await c.createTransfer(user, transfer);
    expect(created.status).toBe(201);
    expect(created.body.transferId).toBe('TR-C');
    expect((await c.getOperations(user, account)).status).toBe(200);
  });

  it('BusinessCustomer: usuario 201, approve/reject 200', async () => {
    const company = makeBusinessCustomer();
    const user = makeUser(SystemRole.BUSINESS_CUSTOMER, company);
    const { transfer } = transferFixture();
    const port = mockPort<{ [k: string]: unknown }>({
      registerCompanyUser: vi.fn(async (u: unknown, d: unknown) => d),
      approveCompanyTransfer: vi.fn(async () => transfer),
      rejectCompanyTransfer: vi.fn(async () => transfer),
    });
    const c = new BusinessCustomerController(port as never);
    expect((await c.registerCompanyUser(user, makeUser())).status).toBe(201);
    expect((await c.approveTransfer(user, transfer)).status).toBe(200);
    expect((await c.rejectTransfer(user, transfer)).status).toBe(200);
  });

  it('BusinessOperator: create 202; Supervisor: pending y approve 200', async () => {
    const { transfer } = transferFixture();
    const op = new BusinessOperatorController(mockPort<{ [k: string]: unknown }>({
      createCompanyTransfer: vi.fn(async () => transfer),
    }) as never);
    const created = await op.createTransfer(makeUser(), transfer);
    expect(created.status).toBe(202);
    expect(created.body.status).toBe('PENDING');

    const sup = new BusinessSupervisorController(mockPort<{ [k: string]: unknown }>({
      consultPendingTransfers: vi.fn(async () => [transfer]),
      approveTransfer: vi.fn(async () => transfer),
    }) as never);
    expect((await sup.pending(makeUser())).body.length).toBe(1);
    expect((await sup.approve(makeUser(), transfer)).status).toBe(200);
  });

  it('Teller: deposit/withdraw/block 200', async () => {
    const owner = makeCustomer();
    const account = makeBankAccount(owner, AccountStatus.ACTIVE, 1000);
    const port = mockPort<{ [k: string]: unknown }>({
      depositFunds: vi.fn(async (_u: unknown, a: typeof account) => { a.deposit(100); return a; }),
      withdrawFunds: vi.fn(async (_u: unknown, a: typeof account) => { a.withdraw(50); return a; }),
      blockBankAccount: vi.fn(async (_u: unknown, a: typeof account) => { a.block(); return a; }),
    });
    const c = new TellerController(port as never);
    const user = makeUser(SystemRole.TELLER_EMPLOYEE);
    expect((await c.deposit(user, account, { amount: 100 })).body.availableBalance).toBe(1100);
    expect((await c.withdraw(user, account, { amount: 50 })).body.availableBalance).toBe(1050);
    expect((await c.block(user, account)).body.status).toBe('BLOCKED');
  });

  it('Commercial: requestLoan 201; Analyst: approve/disburse/audit/status/delete', async () => {
    const customer = makeCustomer();
    const { loan } = loanFixture();
    const com = new CommercialController(mockPort<{ [k: string]: unknown }>({
      requestLoanOnBehalfOfCustomer: vi.fn(async () => loan),
    }) as never);
    expect((await com.requestLoan(makeUser(), customer, loan)).status).toBe(201);

    const product = makeBankAccount(customer);
    const audit = new AuditLog('A-1', OperationType.DEPOSIT, NOW, makeUser(), product, new Map());
    const analyst = new InternalAnalystController(mockPort<{ [k: string]: unknown }>({
      approveLoan: vi.fn(async () => loan),
      disburseLoan: vi.fn(async () => loan),
      consultAuditLog: vi.fn(async () => [audit]),
      changeCustomerStatus: vi.fn(async () => customer),
    }) as never);
    const user = makeUser(SystemRole.INTERNAL_ANALYST);
    expect((await analyst.approveLoan(user, loan, { approvedAmount: 1000, interestRate: 1 })).status).toBe(200);
    expect((await analyst.disburseLoan(user, loan)).status).toBe(200);
    const logs = await analyst.auditLog(user, product);
    expect(logs.status).toBe(200);
    expect(logs.body.totalElements).toBe(1);
    expect((await analyst.changeCustomerStatus(user, customer, { status: 'BLOCKED' })).status).toBe(200);
    const op = new Operation('O-1', OperationType.DEPOSIT, NOW, user, product);
    void op;
    expect(analyst.deleteLoan(user, loan)).toMatchObject({ status: 204 });
  });
});
