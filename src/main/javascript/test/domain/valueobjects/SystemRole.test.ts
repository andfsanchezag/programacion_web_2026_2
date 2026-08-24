import { describe, it, expect } from 'vitest';
import { SystemRole, InvalidSystemRoleException } from '../../../application/domain/valueobjects/SystemRole';

describe('SystemRole', () => {
  it('exposes predefined roles and helpers', () => {
    expect(SystemRole.getAll().length).toBe(7);
    expect(SystemRole.isValid('NATURAL_CUSTOMER')).toBe(true);
    expect(SystemRole.isValid('NOPE')).toBe(false);
    expect(SystemRole.fromCode('INTERNAL_ANALYST')).toBe(SystemRole.INTERNAL_ANALYST);
  });

  it('throws on invalid code', () => {
    expect(() => SystemRole.fromCode('NOPE')).toThrow(InvalidSystemRoleException);
  });

  it('classifies roles', () => {
    expect(SystemRole.NATURAL_CUSTOMER.isCustomerRole()).toBe(true);
    expect(SystemRole.BUSINESS_CUSTOMER.isCustomerRole()).toBe(true);
    expect(SystemRole.INTERNAL_ANALYST.isCustomerRole()).toBe(false);

    expect(SystemRole.TELLER_EMPLOYEE.isEmployeeRole()).toBe(true);
    expect(SystemRole.COMMERCIAL_EMPLOYEE.isEmployeeRole()).toBe(true);
    expect(SystemRole.INTERNAL_ANALYST.isEmployeeRole()).toBe(true);
    expect(SystemRole.NATURAL_CUSTOMER.isEmployeeRole()).toBe(false);

    expect(SystemRole.BUSINESS_SUPERVISOR.canApproveBusinessTransfers()).toBe(true);
    expect(SystemRole.INTERNAL_ANALYST.canApproveBusinessTransfers()).toBe(true);
    expect(SystemRole.NATURAL_CUSTOMER.canApproveBusinessTransfers()).toBe(false);

    expect(SystemRole.INTERNAL_ANALYST.canApproveLoans()).toBe(true);
    expect(SystemRole.BUSINESS_SUPERVISOR.canApproveLoans()).toBe(false);
  });

  it('inherits catalog behavior', () => {
    const r = SystemRole.BUSINESS_OPERATOR;
    expect(r.code).toBe('BUSINESS_OPERATOR');
    expect(r.toString()).toBe('Business Operator (BUSINESS_OPERATOR)');
    expect(r.equals(SystemRole.BUSINESS_OPERATOR)).toBe(true);
  });
});