import { DomainCatalog } from './DomainCatalog';

/**
 * AccountType - Represents the type of a bank account.
 */
export class AccountType extends DomainCatalog {
  private static readonly VALUES: Map<string, AccountType> = new Map();

  static readonly SAVINGS = AccountType.create('SAVINGS', 'Savings Account', 'Account used for personal savings');
  static readonly CHECKING = AccountType.create('CHECKING', 'Checking Account', 'Account used for everyday transactions');

  private constructor(code: string, name: string, description: string) {
    super(code, name, description);
  }

  private static create(code: string, name: string, description: string): AccountType {
    const type = new AccountType(code, name, description);
    AccountType.VALUES.set(code, type);
    return type;
  }

  static fromCode(code: string): AccountType {
    const type = AccountType.VALUES.get(code);
    if (!type) {
      throw new InvalidAccountTypeException(`Invalid account type code: ${code}`);
    }
    return type;
  }

  static getAll(): AccountType[] {
    return Array.from(AccountType.VALUES.values());
  }

  isValid(): boolean {
    return AccountType.VALUES.has(this.code);
  }
}

export class InvalidAccountTypeException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAccountTypeException';
  }
}