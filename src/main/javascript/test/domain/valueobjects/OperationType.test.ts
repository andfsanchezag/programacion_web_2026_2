import { describe, it, expect } from 'vitest';
import { OperationType, InvalidOperationTypeException } from '../../../application/domain/valueobjects/OperationType';

describe('OperationType', () => {
  it('exposes all operation types', () => {
    expect(OperationType.fromCode('DEPOSIT')).toBe(OperationType.DEPOSIT);
    expect(OperationType.LOAN_APPROVAL.isValid()).toBe(true);
    expect(OperationType.getAll().length).toBeGreaterThan(20);
  });

  it('throws on invalid code', () => {
    expect(() => OperationType.fromCode('X')).toThrow(InvalidOperationTypeException);
  });
});