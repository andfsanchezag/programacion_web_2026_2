import { describe, it, expect, vi } from 'vitest';
import { BankAccountTypeOrmMapper, CustomerTypeOrmMapper } from '../../application/adapters/persistence/typeorm/mappers/mappers';
import { CustomerTypeOrmAdapter } from '../../application/adapters/persistence/typeorm/mysql.adapters';
import { AuditLogMongoAdapter } from '../../application/adapters/persistence/mongoose/mongo.adapter';
import { AuditLogMongoMapper } from '../../application/adapters/persistence/mongoose/mappers/AuditLogMongoMapper';
import { AuditLog } from '../../application/domain/models/AuditLog';
import { Operation } from '../../application/domain/models/Operation';
import { OperationType } from '../../application/domain/valueobjects/OperationType';
import { makeNaturalCustomer, makeBankAccount, makeUser } from '../helpers';
import { AccountStatus } from '../../application/domain/valueobjects/AccountStatus';

describe('Persistence: mappers + adapters reales (Fase 2A/2B)', () => {
  it('TypeORM mappers son bidireccionales sin fugar entidades al dominio', () => {
    const owner = makeNaturalCustomer();
    const account = makeBankAccount(owner, AccountStatus.ACTIVE, 1500);
    const entity = BankAccountTypeOrmMapper.toEntity(account);
    expect(entity).toMatchObject({ accountNumber: account.identifier, balance: 1500, currency: 'COP', status: 'ACTIVE' });
    const back = BankAccountTypeOrmMapper.toDomain(entity, owner);
    expect(back.identifier).toBe(account.identifier);
    expect(back.currentBalance).toBe(1500);

    const cent = CustomerTypeOrmMapper.toEntity(owner);
    expect(cent.customerKind).toBe('NATURAL');
    expect(CustomerTypeOrmMapper.toDomain(cent).identification).toBe(owner.identification);
  });

  it('CustomerTypeOrmAdapter delega a TypeORM y reconstruye el agregado', async () => {
    let stored: Record<string, unknown> | null = null;
    const repo = {
      save: vi.fn(async (row: Record<string, unknown>) => { stored = row; return row; }),
      findOne: vi.fn(async () => stored),
      count: vi.fn(async () => (stored ? 1 : 0)),
      find: vi.fn(async () => (stored ? [stored] : [])),
    };
    const adapter = new CustomerTypeOrmAdapter(repo as never);
    const c = makeNaturalCustomer();
    const saved = await adapter.save(c);
    expect(saved.identification).toBe(c.identification);
    expect(repo.save).toHaveBeenCalled();
    expect(await adapter.existsByIdentification(c)).toBe(true);
    expect((await adapter.findAll()).length).toBe(1);
  });

  it('AuditLogMongoAdapter es append-only e inmutable (Mongo 27017)', async () => {
    const user = makeUser();
    const owner = makeNaturalCustomer();
    const product = makeBankAccount(owner);
    const log = new AuditLog('audit-1', OperationType.DEPOSIT, new Date(), user, product,
      new Map([['amount', 500]]));
    const doc = AuditLogMongoMapper.toDocument(log);
    const model = {
      create: vi.fn(async () => ({})),
      findById: vi.fn(() => ({ lean: async () => doc })),
      find: vi.fn(() => ({ lean: async () => [doc] })),
      countDocuments: vi.fn(async () => 1),
    };
    const users = { findByUsername: vi.fn(async () => user) };
    const byProduct = async () => product;
    const accounts = { find: vi.fn(async () => product) };
    const loans = { find: vi.fn(async () => null) };
    const transfers = { find: vi.fn(async () => null) };
    void byProduct;
    const adapter = new AuditLogMongoAdapter(model as never, users as never, accounts as never, loans as never, transfers as never);
    const saved = await adapter.save(log);
    expect(saved.auditId).toBe('audit-1');
    expect(model.create).toHaveBeenCalled();
    expect(await adapter.exists(log)).toBe(true);
    expect((await adapter.findByProduct(product)).length).toBe(1);
    expect(log.userRole.code).toBe(user.role.code);
    const op = new Operation('op-1', OperationType.DEPOSIT, new Date(), user, product);
    expect(op.operationType.code).toBe('DEPOSIT');
  });
});
