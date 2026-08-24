import { describe, it, expect } from 'vitest';
import { AccountStatus, InvalidAccountStatusException } from '../../../application/domain/valueobjects/AccountStatus';

describe('AccountStatus', () => {
  it('exposes statuses and helpers', () => {
    expect(AccountStatus.getAll().length).toBe(4);
    expect(AccountStatus.fromCode('CLOSED')).toBe(AccountStatus.CLOSED);
    expect(AccountStatus.ACTIVE.isValid()).toBe(true);
  });

  it('throws on invalid code', () => {
    expect(() => AccountStatus.fromCode('X')).toThrow(InvalidAccountStatusException);
  });

  it('checks operational rules', () => {
    expect(AccountStatus.ACTIVE.isOperational()).toBe(true);
    expect(AccountStatus.BLOCKED.isOperational()).toBe(false);
    expect(AccountStatus.PENDING_ACTIVATION.isOperational()).toBe(false);

    expect(AccountStatus.ACTIVE.canReceiveFunds()).toBe(true);
    expect(AccountStatus.BLOCKED.canReceiveFunds()).toBe(false);
    expect(AccountStatus.ACTIVE.canWithdrawFunds()).toBe(true);
    expect(AccountStatus.BLOCKED.canWithdrawFunds()).toBe(false);
  });
});