import { DomainCatalog } from './DomainCatalog';

/**
 * CustomerStatus - Represents the customer's banking relationship status.
 * Independent from UserStatus.
 */
export class CustomerStatus extends DomainCatalog {
  private static readonly VALUES: Map<string, CustomerStatus> = new Map();

  static readonly ACTIVE = CustomerStatus.create('ACTIVE', 'Active', 'Customer has an active banking relationship');
  static readonly INACTIVE = CustomerStatus.create('INACTIVE', 'Inactive', 'Customer banking relationship is inactive');
  static readonly BLOCKED = CustomerStatus.create('BLOCKED', 'Blocked', 'Customer banking relationship is blocked');
  static readonly PENDING = CustomerStatus.create('PENDING', 'Pending', 'Customer registration is pending validation');

  private constructor(code: string, name: string, description: string) {
    super(code, name, description);
  }

  private static create(code: string, name: string, description: string): CustomerStatus {
    const status = new CustomerStatus(code, name, description);
    CustomerStatus.VALUES.set(code, status);
    return status;
  }

  static fromCode(code: string): CustomerStatus {
    const status = CustomerStatus.VALUES.get(code);
    if (!status) {
      throw new InvalidCustomerStatusException(`Invalid customer status code: ${code}`);
    }
    return status;
  }

  static getAll(): CustomerStatus[] {
    return Array.from(CustomerStatus.VALUES.values());
  }

  isValid(): boolean {
    return CustomerStatus.VALUES.has(this.code);
  }

  isOperational(): boolean {
    return this.equals(CustomerStatus.ACTIVE);
  }
}

export class InvalidCustomerStatusException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCustomerStatusException';
  }
}