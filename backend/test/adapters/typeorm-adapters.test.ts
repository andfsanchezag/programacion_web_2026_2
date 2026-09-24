import { describe, it, expect, vi } from 'vitest';
import {
  BankAccountTypeOrmAdapter, CustomerTypeOrmAdapter, UserTypeOrmAdapter,
  LoanTypeOrmAdapter, TransferTypeOrmAdapter, OperationTypeOrmAdapter,
} from '../../src/application/adapters/persistence/typeorm/mysql.adapters';
import {
  BankAccountTypeOrmMapper, CustomerTypeOrmMapper, UserTypeOrmMapper,
  LoanTypeOrmMapper, TransferTypeOrmMapper, OperationTypeOrmMapper,
} from '../../src/application/adapters/persistence/typeorm/mappers/mappers';
import { BankAccount } from '../../src/application/domain/models/BankAccount';
import { Loan } from '../../src/application/domain/models/Loan';
import { Transfer } from '../../src/application/domain/models/Transfer';
import { Operation } from '../../src/application/domain/models/Operation';
import { AccountStatus } from '../../src/application/domain/valueobjects/AccountStatus';
import { LoanType } from '../../src/application/domain/valueobjects/LoanType';
import { LoanStatus } from '../../src/application/domain/valueobjects/LoanStatus';
import { TransferStatus } from '../../src/application/domain/valueobjects/TransferStatus';
import { OperationType } from '../../src/application/domain/valueobjects/OperationType';
import { SystemRole } from '../../src/application/domain/valueobjects/SystemRole';
import { makeCustomer, makeNaturalCustomer, makeBusinessCustomer, makeUser, makeBankAccount, NOW } from '../helpers';

/** Repositorio TypeORM en memoria: guarda filas por clave y resuelve where/find. */
function memRepo(pk: string) {
  const rows = new Map<string, Record<string, unknown>>();
  const match = (row: Record<string, unknown>, where?: Record<string, unknown>) =>
    !where || Object.entries(where).every(([k, v]) => row[k] === v);
  return {
    rows,
    save: vi.fn(async (row: object) => {
      const rec = row as Record<string, unknown>;
      rows.set(String(rec[pk]), rec);
      return row;
    }),
    findOne: vi.fn(async (opts: { where: Record<string, unknown> }) =>
      [...rows.values()].find((r) => match(r, opts.where)) ?? null),
    find: vi.fn(async (opts?: { where: Record<string, unknown> }) =>
      [...rows.values()].filter((r) => match(r, opts?.where))),
    count: vi.fn(async (opts: { where: Record<string, unknown> }) =>
      [...rows.values()].filter((r) => match(r, opts.where)).length),
  };
}

function customerInfra() {
  const repo = memRepo('identification');
  const adapter = new CustomerTypeOrmAdapter(repo as never);
  return { repo, adapter };
}

describe('MySQL adapters (puertos reales, repos simulados)', () => {
  it('Customer: save/find natural, business con representante, email, exists, findAll, update', async () => {
    const { repo, adapter } = customerInfra();
    const nat = makeNaturalCustomer();
    const saved = await adapter.save(nat);
    expect(saved.identification).toBe(nat.identification);
    expect(await adapter.findByIdentification(nat)).not.toBeNull();
    expect(await adapter.findByEmail(nat)).not.toBeNull();
    expect(await adapter.existsByIdentification(nat)).toBe(true);
    expect(await adapter.existsByEmail(nat)).toBe(true);
    expect(await adapter.findByEmail(makeNaturalCustomer())).toBeNull();
    expect(await adapter.existsByIdentification(makeNaturalCustomer())).toBe(false);

    const biz = makeBusinessCustomer();
    await repo.save(CustomerTypeOrmMapper.toEntity(biz.legalRepresentative));
    const savedBiz = await adapter.save(biz);
    expect(savedBiz.identification).toBe(biz.identification);

    const all = await adapter.findAll();
    expect(all.length).toBe(3);
    await adapter.update(nat);
    expect(repo.save).toHaveBeenCalled();
  });

  it('Customer business sin representante resoluble devuelve null', async () => {
    const { adapter } = customerInfra();
    const biz = makeBusinessCustomer();
    // Solo la fila business, sin fila del representante.
    const raw = adapter as unknown as { repo: { save: (r: unknown) => Promise<unknown> } };
    await raw.repo.save(CustomerTypeOrmMapper.toEntity(biz));
    expect(await adapter.findByIdentification(biz)).toBeNull();
  });

  it('User: save/find con y sin cliente, findById, exists, update', async () => {
    const { adapter: customers } = customerInfra();
    const repo = memRepo('username');
    const adapter = new UserTypeOrmAdapter(repo as never, customers);
    const customer = makeCustomer();
    await customers.save(customer);
    const user = makeUser(SystemRole.NATURAL_CUSTOMER, customer);
    expect((await adapter.save(user)).username).toBe(user.username);
    expect(await adapter.findByUsername(user)).not.toBeNull();
    expect(await adapter.findById(user)).not.toBeNull();
    expect(await adapter.existsByUsername(user)).toBe(true);
    const lone = makeUser(SystemRole.TELLER_EMPLOYEE);
    await adapter.save(lone);
    expect((await adapter.findByUsername(lone))?.customer).toBeNull();
    expect(await adapter.findByUsername(makeUser())).toBeNull();
    expect(await adapter.findById(makeUser())).toBeNull();
    await adapter.update(user);
    expect(repo.save).toHaveBeenCalled();
  });

  it('BankAccount: save/find, owner ausente falla, exists, update, findAllByOwner', async () => {
    const { adapter: customers } = customerInfra();
    const repo = memRepo('accountNumber');
    const adapter = new BankAccountTypeOrmAdapter(repo as never, customers);
    const owner = makeCustomer();
    await customers.save(owner);
    const acc = makeBankAccount(owner, AccountStatus.ACTIVE, 250);
    expect((await adapter.save(acc)).currentBalance).toBe(250);
    expect(await adapter.find(acc)).not.toBeNull();
    expect(await adapter.exists(acc)).toBe(true);
    expect(await adapter.find(makeBankAccount(owner))).toBeNull();
    expect((await adapter.findAllByOwner(owner)).length).toBe(1);
    await adapter.update(acc);
    // Cuenta cuya fila existe pero el dueño no está registrado.
    const orphan = makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0);
    await repo.save(BankAccountTypeOrmMapper.toEntity(orphan));
    await expect(adapter.find(orphan)).rejects.toThrow('not found');
  });

  function loanInfra() {
    const { adapter: customers } = customerInfra();
    const accounts = new BankAccountTypeOrmAdapter(memRepo('accountNumber') as never, customers);
    const loans = new LoanTypeOrmAdapter(memRepo('loanId') as never, customers, accounts);
    return { customers, accounts, loans };
  }

  it('Loan: save/find, faltantes, exists, update, findAllByApplicant', async () => {
    const { customers, accounts, loans } = loanInfra();
    const applicant = makeCustomer();
    await customers.save(applicant);
    const dest = makeBankAccount(applicant, AccountStatus.ACTIVE, 0);
    await accounts.save(dest);
    const loan = new Loan('LN-1', applicant, LoanType.PERSONAL, 1000, 0.1, 12, dest);
    expect((await loans.save(loan)).identifier).toBe('LN-1');
    expect(await loans.find(loan)).not.toBeNull();
    expect(await loans.exists(loan)).toBe(true);
    expect((await loans.findAllByApplicant(applicant)).length).toBe(1);
    await loans.update(loan);
    const missing = new Loan('LN-X', applicant, LoanType.PERSONAL, 1, 0, 1, dest);
    expect(await loans.find(missing)).toBeNull();
    expect(await loans.exists(missing)).toBe(false);
    // Fila huérfana (solicitante inexistente) al leer.
    const orphan = new Loan('LN-O', makeCustomer(), LoanType.PERSONAL, 1, 0, 1, dest);
    await (loans as unknown as { repo: { save: (r: unknown) => Promise<unknown> } }).repo.save(
      LoanTypeOrmMapper.toEntity(orphan));
    await expect(loans.find(orphan)).rejects.toThrow('missing applicant');
  });

  function transferInfra() {
    const { adapter: customers } = customerInfra();
    const accounts = new BankAccountTypeOrmAdapter(memRepo('accountNumber') as never, customers);
    const users = new UserTypeOrmAdapter(memRepo('username') as never, customers);
    const transfers = new TransferTypeOrmAdapter(memRepo('transferId') as never, accounts, users);
    return { customers, accounts, users, transfers };
  }

  it('Transfer: save/find con y sin aprobador, faltantes, exists, update, findAll', async () => {
    const { customers, accounts, users, transfers } = transferInfra();
    const owner = makeCustomer();
    await customers.save(owner);
    const src = makeBankAccount(owner, AccountStatus.ACTIVE, 1000);
    const dst = makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0);
    await customers.save(dst.owner);
    await accounts.save(src);
    await accounts.save(dst);
    const by = makeUser(SystemRole.NATURAL_CUSTOMER, owner);
    await users.save(by);
    const t = new Transfer('TR-1', src, dst, 100, NOW, by);
    t.submitForApproval();
    t.approve(by, NOW);
    expect((await transfers.save(t)).transferStatus).toBe(TransferStatus.APPROVED);
    expect(await transfers.find(t)).not.toBeNull();
    expect(await transfers.exists(t)).toBe(true);
    expect((await transfers.findAll()).length).toBe(1);
    await transfers.update(t);
    const pending = new Transfer('TR-2', src, dst, 50, NOW, by);
    await transfers.save(pending);
    expect((await transfers.find(pending))?.transferStatus).toBe(TransferStatus.PENDING);
    expect(await transfers.find(new Transfer('TR-X', src, dst, 1, NOW, by))).toBeNull();
    // Fila con cuentas inexistentes.
    const ghost = new Transfer('TR-G', makeBankAccount(makeCustomer()), makeBankAccount(makeCustomer()), 1, NOW, by);
    await (transfers as unknown as { repo: { save: (r: unknown) => Promise<unknown> } }).repo.save(
      TransferTypeOrmMapper.toEntity(ghost));
    await expect(transfers.find(ghost)).rejects.toThrow('missing accounts');
  });

  it('Operation: findProduct por cadena, save/find, findByProduct, exists, findAll', async () => {
    const { customers, accounts, users, transfers } = transferInfra();
    const loans = new LoanTypeOrmAdapter(memRepo('loanId') as never, customers, accounts);
    const ops = new OperationTypeOrmAdapter(memRepo('operationId') as never, users, accounts, loans, transfers);
    const owner = makeCustomer();
    await customers.save(owner);
    const acc = makeBankAccount(owner, AccountStatus.ACTIVE, 0);
    await accounts.save(acc);
    const user = makeUser(SystemRole.TELLER_EMPLOYEE);
    await users.save(user);
    const op = new Operation('OP-9', OperationType.DEPOSIT, NOW, user, acc);
    expect((await ops.save(op)).operationId).toBe('OP-9');
    expect(await ops.find(op)).not.toBeNull();
    expect(await ops.exists(op)).toBe(true);
    expect((await ops.findByProduct(acc)).length).toBe(1);
    expect((await ops.findAll()).length).toBe(1);
    // Cadena de resolución: cuenta ausente -> préstamo ausente -> transferencia ausente.
    expect(await ops.findProduct('NO-EXISTE')).toBeNull();
  });

  it('Operation.findProduct recorre préstamos y transferencias', async () => {
    const { customers, accounts, users, transfers } = transferInfra();
    const loans = new LoanTypeOrmAdapter(memRepo('loanId') as never, customers, accounts);
    const ops = new OperationTypeOrmAdapter(memRepo('operationId') as never, users, accounts, loans, transfers);
    const owner = makeCustomer();
    await customers.save(owner);
    const dest = makeBankAccount(owner, AccountStatus.ACTIVE, 0);
    await accounts.save(dest);
    // Préstamo resoluble por identificador (sin cuenta con ese id).
    const loan = new Loan('LN-FP', owner, LoanType.PERSONAL, 100, 0.1, 6, dest);
    await loans.save(loan);
    expect(await ops.findProduct('LN-FP')).not.toBeNull();
    // Transferencia resoluble (sin cuenta ni préstamo con ese id).
    const by = makeUser(SystemRole.NATURAL_CUSTOMER, owner);
    await users.save(by);
    const t = new Transfer('TR-FP', dest, makeBankAccount(owner, AccountStatus.ACTIVE, 0), 10, NOW, by);
    await accounts.save(t.destinationAccount);
    await transfers.save(t);
    expect(await ops.findProduct('TR-FP')).not.toBeNull();
    // findAll incluye lo persistido.
    const user = makeUser(SystemRole.TELLER_EMPLOYEE);
    await users.save(user);
    const op = new Operation('OP-FP', OperationType.DEPOSIT, NOW, user, dest);
    await ops.save(op);
    expect((await ops.findAll()).length).toBeGreaterThanOrEqual(1);
  });
});
