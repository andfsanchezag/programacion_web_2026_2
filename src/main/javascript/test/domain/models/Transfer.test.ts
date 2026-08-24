import { describe, it, expect } from 'vitest';
import { Transfer } from '../../../application/domain/models/Transfer';
import {
  InvalidTransferException,
  TransferAlreadyRejectedException,
  TransferAlreadyExpiredException,
  InvalidTransferStatusTransitionException,
  InvalidTransferStatusException,
} from '../../../application/domain/exceptions/transfer-errors';
import { TransferStatus } from '../../../application/domain/valueobjects/TransferStatus';
import { SystemRole } from '../../../application/domain/valueobjects/SystemRole';
import { AccountStatus } from '../../../application/domain/valueobjects/AccountStatus';
import { NOW, makeCustomer, makeUser, makeBankAccount } from '../../helpers';

const APPROVAL = new Date('2026-09-03T10:00:00Z');

function makeTransfer(status: TransferStatus = TransferStatus.PENDING): Transfer {
  const owner = makeCustomer();
  return new Transfer(
    'tr-1',
    makeBankAccount(owner, AccountStatus.ACTIVE, 500),
    makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0),
    100,
    NOW,
    makeUser(SystemRole.NATURAL_CUSTOMER, owner),
    status,
    null,
    null
  );
}

describe('Transfer', () => {
  it('exposes attributes', () => {
    const t = makeTransfer();
    expect(t.identifier).toBe('tr-1');
    expect(t.amount).toBe(100);
    expect(t.creationDate).toBe(NOW);
    expect(t.approvalDate).toBeNull();
    expect(t.approvedBy).toBeNull();
    expect(t.transferStatus.code).toBe(TransferStatus.PENDING.code);
    expect(t.sourceAccount.currentBalance).toBe(500);
    expect(t.destinationAccount.currentBalance).toBe(0);
    expect(t.createdBy.username).toContain('username');
  });

  it('rejects invalid constructor arguments', () => {
    const owner = makeCustomer();
    const source = makeBankAccount(owner, AccountStatus.ACTIVE, 100);
    expect(() => new Transfer('t', undefined as never, makeBankAccount(owner), 1, NOW, makeUser())).toThrow(InvalidTransferException);
    expect(() => new Transfer('t', source, undefined as never, 1, NOW, makeUser())).toThrow(InvalidTransferException);
    expect(() => new Transfer('t', source, makeBankAccount(owner), 0, NOW, makeUser())).toThrow(InvalidTransferException);
    expect(() => new Transfer('t', source, source, 1, NOW, makeUser())).toThrow(InvalidTransferException);
  });

  it('submits a pending transfer for approval', () => {
    const t = makeTransfer();
    t.submitForApproval();
    expect(t.transferStatus.code).toBe(TransferStatus.WAITING_FOR_APPROVAL.code);
  });

  it('only submits pending transfers', () => {
    expect(() => makeTransfer(TransferStatus.WAITING_FOR_APPROVAL).submitForApproval()).toThrow('Transfer must be in status PENDING');
  });

  it('approves waiting transfers recording approver and date', () => {
    const t = makeTransfer();
    t.submitForApproval();
    const approver = makeUser(SystemRole.BUSINESS_SUPERVISOR);
    t.approve(approver, APPROVAL);
    expect(t.transferStatus.code).toBe(TransferStatus.APPROVED.code);
    expect(t.approvedBy).toBe(approver);
    expect(t.approvalDate).toBe(APPROVAL);
  });

  it('rejects transfers from pending or waiting states', () => {
    const pending = makeTransfer(TransferStatus.PENDING);
    pending.reject(APPROVAL);
    expect(pending.transferStatus.code).toBe(TransferStatus.REJECTED.code);
    expect(() => pending.reject(APPROVAL)).toThrow('already been rejected');

    const executed = makeTransfer(TransferStatus.EXECUTED);
    expect(() => executed.reject(APPROVAL)).toThrow(/pending or waiting-for-approval/);
  });

  it('expires only waiting-for-approval transfers once', () => {
    const t = makeTransfer();
    t.submitForApproval();
    t.expire();
    expect(t.transferStatus.code).toBe(TransferStatus.EXPIRED.code);
    expect(() => t.expire()).toThrow('already expired');
    expect(() => makeTransfer(TransferStatus.PENDING).expire()).toThrow(/waiting-for-approval/);
  });

  it('marks approved transfers as executed', () => {
    const t = makeTransfer();
    t.submitForApproval();
    t.approve(makeUser(SystemRole.INTERNAL_ANALYST), APPROVAL);
    t.markExecuted();
    expect(t.transferStatus.code).toBe(TransferStatus.EXECUTED.code);
    expect(() => makeTransfer(TransferStatus.PENDING).markExecuted()).toThrow('status APPROVED');
  });
});