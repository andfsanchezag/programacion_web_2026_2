import { describe, it, expect } from 'vitest';
import { CustomerStatus, InvalidCustomerStatusException } from '../../../application/domain/valueobjects/CustomerStatus';

describe('CustomerStatus', () => {
  it('exposes statuses and helpers', () => {
    expect(CustomerStatus.getAll().length).toBe(4);
    expect(CustomerStatus.fromCode('BLOCKED')).toBe(CustomerStatus.BLOCKED);
    expect(CustomerStatus.ACTIVE.isValid()).toBe(true);
  });

  it('throws on invalid code', () => {
    expect(() => CustomerStatus.fromCode('NOPE')).toThrow(InvalidCustomerStatusException);
  });

  it('checks operational status', () => {
    expect(CustomerStatus.ACTIVE.isOperational()).toBe(true);
    expect(CustomerStatus.INACTIVE.isOperational()).toBe(false);
    expect(CustomerStatus.BLOCKED.isOperational()).toBe(false);
  });
});