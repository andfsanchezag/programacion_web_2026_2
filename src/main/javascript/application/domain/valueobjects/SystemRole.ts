import { DomainCatalog } from './DomainCatalog';

/**
 * SystemRole - Represents the responsibilities and permissions assigned to a person
 * within the banking system.
 *
 * The role is defined in Person and inherited by its specializations, including
 * Customer and User.
 */
export class SystemRole extends DomainCatalog {
  private static readonly VALUES: Map<string, SystemRole> = new Map();

  static readonly NATURAL_CUSTOMER = SystemRole.create(
    'NATURAL_CUSTOMER', 'Natural Customer', 'Individual banking customer'
  );

  static readonly BUSINESS_CUSTOMER = SystemRole.create(
    'BUSINESS_CUSTOMER', 'Business Customer', 'Corporate banking customer'
  );

  static readonly TELLER_EMPLOYEE = SystemRole.create(
    'TELLER_EMPLOYEE', 'Teller Employee', 'Employee responsible for performing branch operations'
  );

  static readonly COMMERCIAL_EMPLOYEE = SystemRole.create(
    'COMMERCIAL_EMPLOYEE', 'Commercial Employee', 'Employee responsible for customer relationships and loan-related activities'
  );

  static readonly BUSINESS_OPERATOR = SystemRole.create(
    'BUSINESS_OPERATOR', 'Business Operator', 'User authorized to perform operations on behalf of business customers'
  );

  static readonly BUSINESS_SUPERVISOR = SystemRole.create(
    'BUSINESS_SUPERVISOR', 'Business Supervisor', 'User authorized to approve business transfers requiring authorization'
  );

  static readonly INTERNAL_ANALYST = SystemRole.create(
    'INTERNAL_ANALYST', 'Internal Analyst', 'User responsible for reviewing and approving loan applications'
  );

  private constructor(code: string, name: string, description: string) {
    super(code, name, description);
  }

  private static create(code: string, name: string, description: string): SystemRole {
    const role = new SystemRole(code, name, description);
    SystemRole.VALUES.set(code, role);
    return role;
  }

  static fromCode(code: string): SystemRole {
    const role = SystemRole.VALUES.get(code);
    if (!role) {
      throw new InvalidSystemRoleException(`Invalid system role code: ${code}`);
    }
    return role;
  }

  static getAll(): SystemRole[] {
    return Array.from(SystemRole.VALUES.values());
  }

  static isValid(code: string): boolean {
    return SystemRole.VALUES.has(code);
  }

  isCustomerRole(): boolean {
    return this.equals(SystemRole.NATURAL_CUSTOMER) || this.equals(SystemRole.BUSINESS_CUSTOMER);
  }

  isEmployeeRole(): boolean {
    return this.equals(SystemRole.TELLER_EMPLOYEE) ||
      this.equals(SystemRole.COMMERCIAL_EMPLOYEE) ||
      this.equals(SystemRole.INTERNAL_ANALYST);
  }

  canApproveBusinessTransfers(): boolean {
    return this.equals(SystemRole.BUSINESS_SUPERVISOR) || this.equals(SystemRole.INTERNAL_ANALYST);
  }

  canApproveLoans(): boolean {
    return this.equals(SystemRole.INTERNAL_ANALYST);
  }
}

export class InvalidSystemRoleException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSystemRoleException';
  }
}