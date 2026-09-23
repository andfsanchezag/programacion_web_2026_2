import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import {
  CustomerSchema, UserSchema, BankAccountSchema, LoanSchema, TransferSchema,
  OperationSchema, ALL_SCHEMAS,
} from '../../application/adapters/persistence/typeorm/schemas';
import { getAuditLogModel } from '../../application/adapters/persistence/mongoose/auditLog.model';
import { lookupCustomer, accountRef, loanRef, transferRef } from '../../application/adapters/persistence/refs';

describe('Persistence definitions (Fase 2A/2B)', () => {
  it('TypeORM schemas apuntan a las tablas bank_db con columnas clave', () => {
    expect(CustomerSchema.options.tableName).toBe('customers');
    expect(UserSchema.options.tableName).toBe('users');
    expect(BankAccountSchema.options.tableName).toBe('bank_accounts');
    expect(LoanSchema.options.tableName).toBe('loans');
    expect(TransferSchema.options.tableName).toBe('transfers');
    expect(OperationSchema.options.tableName).toBe('operations');
    expect(ALL_SCHEMAS).toHaveLength(6);
    const cols = (s: { options: { columns?: object } }) =>
      Object.keys((s.options.columns ?? {}) as Record<string, unknown>);
    expect(cols(CustomerSchema)).toContain('identification');
    expect(cols(UserSchema)).toContain('username');
    expect(cols(BankAccountSchema)).toContain('accountNumber');
    expect(cols(LoanSchema)).toContain('loanId');
    expect(cols(TransferSchema)).toContain('transferId');
    expect(cols(OperationSchema)).toContain('operationId');
  });

  it('getAuditLogModel registra el modelo audit_logs sin conexión viva', async () => {
    const conn = mongoose.createConnection();
    try {
      const m1 = getAuditLogModel(conn);
      const m2 = getAuditLogModel(conn);
      expect(m1).toBe(m2);
      expect(m1.collection.name).toBe('audit_logs');
      expect(Object.keys(m1.schema.paths)).toEqual(
        expect.arrayContaining(['operationType', 'performedByUsername', 'affectedProductIdentifier']));
    } finally {
      await conn.destroy();
    }
  });

  it('refs construyen modelos de dominio válidos para búsquedas por puerto', () => {
    const c = lookupCustomer('1017');
    expect(c.identification).toBe('1017');
    expect(accountRef('CTA-1').identifier).toBe('CTA-1');
    expect(accountRef('CTA-2', c).owner.identification).toBe('1017');
    expect(loanRef('LOAN-1').identifier).toBe('LOAN-1');
    expect(loanRef('LOAN-1').destinationAccount.identifier).toBe('dst-LOAN-1');
    const t = transferRef('TRF-1');
    expect(t.sourceAccount.identifier).toBe('src-TRF-1');
    expect(t.destinationAccount.identifier).toBe('dst-TRF-1');
    expect(t.createdBy.username).toBe('lookup');
  });
});
