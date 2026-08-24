import { describe, it, expect } from 'vitest';
import { LoanStatus, InvalidLoanStatusException } from '../../../application/domain/valueobjects/LoanStatus';

describe('LoanStatus', () => {
  it('exposes statuses and helpers', () => {
    expect(LoanStatus.getAll().length).toBe(5);
    expect(LoanStatus.fromCode('APPROVED')).toBe(LoanStatus.APPROVED);
    expect(LoanStatus.UNDER_REVIEW.isValid()).toBe(true);
  });

  it('throws on invalid code', () => {
    expect(() => LoanStatus.fromCode('X')).toThrow(InvalidLoanStatusException);
  });

  it('checks lifecycle capabilities', () => {
    expect(LoanStatus.APPROVED.canBeDisbursed()).toBe(true);
    expect(LoanStatus.UNDER_REVIEW.canBeDisbursed()).toBe(false);

    expect(LoanStatus.DISBURSED.canReceivePayments()).toBe(true);
    expect(LoanStatus.APPROVED.canReceivePayments()).toBe(false);

    expect(LoanStatus.DISBURSED.canBeClosed()).toBe(true);
    expect(LoanStatus.UNDER_REVIEW.canBeClosed()).toBe(false);
  });
});