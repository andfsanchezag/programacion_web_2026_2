import { DomainCatalog } from './DomainCatalog';

/**
 * AccountStatus - Represents the lifecycle state of a bank account.
 */
export class AccountStatus extends DomainCatalog {
  private static readonly VALUES: Map<string, AccountStatus> = new Map();

  static readonly ACTIVE = AccountStatus.create('ACTIVE', 'Active', 'Account is active and operational');
  static readonly BLOCKED = AccountStatus.create('BLOCKED', 'Blocked', 'Account is blocked and restricted');
  static readonly CLOSED = AccountStatus.create('CLOSED', 'Closed', 'Account is closed');
  static readonly PENDING_ACTIVATION = AccountStatus.create('PENDING_ACTIVATION', 'Pending Activation', 'Account is awaiting activation');

  private constructor(code: string, name: string, description: string) {
    super(code, name, description);
  }

  private static create(code: string, name: string, description: string): AccountStatus {
    const status = new AccountStatus(code, name, description);
    AccountStatus.VALUES.set(code, status);
    return status;
  }

  static fromCode(code: string): AccountStatus {
    const status = AccountStatus.VALUES.get(code);
    if (!status) {
      throw new InvalidAccountStatusException(`Invalid account status code: ${code}`);
    }
    return status;
  }

  static getAll(): AccountStatus[] {
    return Array.from(AccountStatus.VALUES.values());
  }

  isValid(): boolean {
    return AccountStatus.VALUES.has(this.code);
  }

  isOperational(): boolean {
    return this.equals(AccountStatus.ACTIVE);
  }

  canReceiveFunds(): boolean {
    return this.equals(AccountStatus.ACTIVE);
  }

  canWithdrawFunds(): boolean {
    return this.equals(AccountStatus.ACTIVE);
  }
}

export class InvalidAccountStatusException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAccountStatusException';
  }
}