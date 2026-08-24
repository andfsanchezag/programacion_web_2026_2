import { describe, it, expect } from 'vitest';
import { AccountType, InvalidAccountTypeException } from '../../../application/domain/valueobjects/AccountType';

describe('AccountType', () => {
  it('exposes types and helpers', () => {
    expect(AccountType.getAll().length).toBe(2);
    expect(AccountType.fromCode('SAVINGS')).toBe(AccountType.SAVINGS);
    expect(AccountType.CHECKING.isValid()).toBe(true);
  });

  it('throws on invalid code', () => {
    expect(() => AccountType.fromCode('X')).toThrow(InvalidAccountTypeException);
  });
});