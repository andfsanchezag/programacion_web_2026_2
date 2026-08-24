import { describe, it, expect } from 'vitest';
import { LoanType, InvalidLoanTypeException } from '../../../application/domain/valueobjects/LoanType';

describe('LoanType', () => {
  it('exposes types and helpers', () => {
    expect(LoanType.getAll().length).toBe(3);
    expect(LoanType.fromCode('BUSINESS')).toBe(LoanType.BUSINESS);
    expect(LoanType.PERSONAL.isValid()).toBe(true);
  });

  it('throws on invalid code', () => {
    expect(() => LoanType.fromCode('X')).toThrow(InvalidLoanTypeException);
  });
});