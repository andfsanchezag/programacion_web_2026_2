import { describe, it, expect } from 'vitest';
import { createApp } from '../../application/app';
import { AppRepositories } from '../../application/app';
import { makeNaturalCustomer, makeBankAccount, makeUser } from '../helpers';
import { SystemRole } from '../../application/domain/valueobjects/SystemRole';
import { AccountStatus } from '../../application/domain/valueobjects/AccountStatus';
import { User } from '../../application/domain/models/User';
import { UserStatus } from '../../application/domain/valueobjects/UserStatus';
import { Customer } from '../../application/domain/models/Customer';
import { BankAccount } from '../../application/domain/models/BankAccount';

/**
 * Dobles de test de los Output Ports (async, como los adapters reales).
 * Aíslan la app de MySQL/Mongo en unit tests; en producción se inyectan
 * los adapters TypeORM/Mongoose vía bootstrapPersistence().
 */
function stubRepositories(): AppRepositories {
  const customers = new Map<string, Customer>();
  const users = new Map<string, User>();
  const accounts = new Map<string, BankAccount>();
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
      save: async (l: never) => l, find: async () => null, exists: async () => false,
      update: async () => {}, findAllByApplicant: async () => [],
    },
    transfers: {
      save: async (t: never) => t, find: async () => null, exists: async () => false,
      update: async () => {}, findAll: async () => [],
    },
    operations: {
      save: async (o: never) => o, find: async () => null, findByProduct: async () => [],
      exists: async () => false, findAll: async () => [],
    },
    audits: {
      save: async (a: never) => a, find: async () => null, findByProduct: async () => [],
      exists: async () => false, findAll: async () => [],
    },
  } as unknown as AppRepositories;
}

const buildApp = () => createApp({ jwtSecret: 's1', repositories: stubRepositories() });

describe('UseCases por rol + REST (Fases 3B/4/5)', () => {
  it('PublicAccess: registra cliente natural y crea usuario', async () => {
    const app = buildApp();
    const customer = makeNaturalCustomer();
    const saved = await app.useCases.publicAccess.registerNaturalCustomer(customer);
    expect(saved.identification).toBe(customer.identification);

    const user = new User('u-1', customer.identification, customer.name, customer.email,
      customer.phone, customer.address, SystemRole.NATURAL_CUSTOMER, 'juanperez95',
      'StrongPassword123!', UserStatus.ACTIVE, saved);
    const created = await app.useCases.publicAccess.registerCustomerUser(user);
    expect(created.username).toBe('juanperez95');
  });

  it('Teller: deposita por caso de uso y por controlador REST', async () => {
    const app = buildApp();
    const customer = makeNaturalCustomer();
    await app.repositories.customers.save(customer);
    const teller = makeUser(SystemRole.TELLER_EMPLOYEE);
    const account = makeBankAccount(customer, AccountStatus.ACTIVE, 1000);
    await app.repositories.accounts.save(account);

    const updated = await app.useCases.teller.depositFunds(teller, account, 500);
    expect(updated.currentBalance).toBe(1500);

    const res = await app.controllers.teller.deposit(teller, account, { amount: 500 });
    expect(res.status).toBe(200);
    expect(res.body.availableBalance).toBe(2000);
  });

  it('BusinessCustomer: registra usuario delegado de la empresa sin analista (SDD 5.2)', async () => {
    const app = buildApp();
    const { makeBusinessCustomer } = await import('../helpers');
    const company = makeBusinessCustomer();
    await app.repositories.customers.save(company);
    const actor = new User('u-biz', company.identification, company.name, company.email,
      company.phone, company.address, SystemRole.BUSINESS_CUSTOMER, 'bizadmin',
      'StrongPassword123!', UserStatus.ACTIVE, company);
    await app.repositories.users.save(actor);
    const delegated = new User('u-op', 'op-id-1', 'Op Uno', 'op@corp.com',
      '', '', SystemRole.BUSINESS_OPERATOR, 'operativo1',
      'StrongPassword123!', UserStatus.ACTIVE, company);
    const created = await app.useCases.businessCustomer.registerCompanyUser(actor, delegated);
    expect(created.username).toBe('operativo1');
    expect(created.passwordHash).not.toBe('StrongPassword123!');
    await expect(app.useCases.businessCustomer.registerCompanyUser(
      actor, new User('u-x', 'x-id', 'X', 'x@corp.com', '', '', SystemRole.BUSINESS_OPERATOR,
        'externo1', 'StrongPassword123!', UserStatus.ACTIVE, makeNaturalCustomer()),
    )).rejects.toThrow('belong to the company');
  });

  it('AuthController.login emite JWT válido con claims userId/username/role/email', async () => {
    const app = buildApp();
    const customer = makeNaturalCustomer();
    await app.repositories.customers.save(customer);
    const raw = 'StrongPassword123!';
    const domain = new User('u-login', customer.identification, customer.name, customer.email,
      customer.phone, customer.address, SystemRole.NATURAL_CUSTOMER, 'loginuser',
      raw, UserStatus.ACTIVE, customer);
    await app.useCases.publicAccess.registerCustomerUser(domain);

    const res = await app.controllers.auth.login({ username: 'loginuser', password: raw });
    expect(res.status).toBe(200);
    expect(res.body.token.split('.')).toHaveLength(3);
    expect(app.jwt.isValid(res.body.token)).toBe(true);
  });

  it('InternalAnalyst: consulta auditoría vía controlador con paginación', async () => {
    const app = buildApp();
    const analyst = makeUser(SystemRole.INTERNAL_ANALYST);
    const customer = makeNaturalCustomer();
    await app.repositories.customers.save(customer);
    const account = makeBankAccount(customer, AccountStatus.ACTIVE, 0);
    const res = await app.controllers.analyst.auditLog(analyst, account);
    expect(res.status).toBe(200);
    expect(res.body.totalPages).toBe(1);
  });
});
