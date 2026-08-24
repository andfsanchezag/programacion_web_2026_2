import { describe, it, expect } from 'vitest';
import { Operation } from '../../../application/domain/models/Operation';
import { AuditLog } from '../../../application/domain/models/AuditLog';
import {
  InvalidOperationException,
  InvalidOperationUserException,
  InvalidAffectedProductException,
  InvalidAuditLogException,
  InvalidAuditInformationException,
} from '../../../application/domain/exceptions/operation-audit-errors';
import { OperationType } from '../../../application/domain/valueobjects/OperationType';
import { AccountStatus } from '../../../application/domain/valueobjects/AccountStatus';
import { NOW, makeCustomer, makeUser, makeBankAccount } from '../../helpers';

function product() {
  return makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 10);
}

function makeOperation(
  id = 'op-1', type: OperationType = OperationType.DEPOSIT,
  user = makeUser(), affected = product()
): Operation {
  return new Operation(id, type, NOW, user, affected);
}

describe('Operation', () => {
  it('creates with relationships to User and BankingProduct', () => {
    const op = makeOperation();
    expect(op.operationId).toBe('op-1');
    expect(op.operationType).toBe(OperationType.DEPOSIT);
    expect(op.executionDate).toBe(NOW);
    expect(op.affectedProduct.identifier).toContain('acc-');
  });

  it('rejects invalid arguments', () => {
    expect(() => makeOperation('')).toThrow(InvalidOperationException);
    expect(() => makeOperation(null as unknown as string)).toThrow(InvalidOperationException);
    expect(() => makeOperation('op-2', null as unknown as OperationType)).toThrow(InvalidOperationException);
    expect(() => makeOperation('op-3', OperationType.DEPOSIT, null as never)).toThrow(InvalidOperationUserException);
    expect(() => makeOperation('op-4', OperationType.DEPOSIT, makeUser(), null as never)).toThrow(InvalidAffectedProductException);
  });
});

describe('AuditLog', () => {
  const details = new Map<string, unknown>([['channel', 'email']]);

  function makeAudit(id = 'aud-1', performedByUser = makeUser(), d: Map<string, unknown> | null = details) {
    return new AuditLog(id, OperationType.DEPOSIT, NOW, performedByUser, product(), d as Map<string, unknown>);
  }

  it('creates an immutable audit record preserving the user role', () => {
    const audit = makeAudit();
    expect(audit.auditId).toBe('aud-1');
    expect(audit.operationType).toBe(OperationType.DEPOSIT);
    expect(audit.operationDate).toBe(NOW);
    expect(audit.userRole.code).toBe(audit.performedBy.role.code);
    expect(audit.details.get('channel')).toBe('email');
  });

  it('rejects invalid arguments', () => {
    expect(() => makeAudit('')).toThrow(InvalidAuditLogException);
    expect(() => makeAudit(null as unknown as string)).toThrow(InvalidAuditLogException);
    expect(() => makeAudit('a-1', makeUser(), null as unknown as Map<string, unknown>)).toThrow(InvalidAuditInformationException);
  });
});