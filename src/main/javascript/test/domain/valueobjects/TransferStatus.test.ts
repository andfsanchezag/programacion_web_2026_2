import { describe, it, expect } from 'vitest';
import { TransferStatus, InvalidTransferStatusException } from '../../../application/domain/valueobjects/TransferStatus';

describe('TransferStatus', () => {
  it('exposes statuses and helpers', () => {
    expect(TransferStatus.getAll().length).toBe(6);
    expect(TransferStatus.fromCode('EXECUTED')).toBe(TransferStatus.EXECUTED);
    expect(TransferStatus.PENDING.isValid()).toBe(true);
  });

  it('throws on invalid code', () => {
    expect(() => TransferStatus.fromCode('X')).toThrow(InvalidTransferStatusException);
  });

  it('checks execution capability', () => {
    expect(TransferStatus.APPROVED.canBeExecuted()).toBe(true);
    expect(TransferStatus.WAITING_FOR_APPROVAL.canBeExecuted()).toBe(false);
  });
});