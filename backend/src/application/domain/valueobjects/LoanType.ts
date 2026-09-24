import { DomainCatalog } from './DomainCatalog';

/**
 * LoanType - Represents the type of a loan.
 */
export class LoanType extends DomainCatalog {
  private static readonly VALUES: Map<string, LoanType> = new Map();

  static readonly PERSONAL = LoanType.create('PERSONAL', 'Personal Loan', 'Loan granted to an individual');
  static readonly BUSINESS = LoanType.create('BUSINESS', 'Business Loan', 'Loan granted to a business');
  static readonly HOME = LoanType.create('HOME', 'Home Loan', 'Loan granted for housing purposes');

  private constructor(code: string, name: string, description: string) {
    super(code, name, description);
  }

  private static create(code: string, name: string, description: string): LoanType {
    const type = new LoanType(code, name, description);
    LoanType.VALUES.set(code, type);
    return type;
  }

  static fromCode(code: string): LoanType {
    const type = LoanType.VALUES.get(code);
    if (!type) {
      throw new InvalidLoanTypeException(`Invalid loan type code: ${code}`);
    }
    return type;
  }

  static getAll(): LoanType[] {
    return Array.from(LoanType.VALUES.values());
  }

  isValid(): boolean {
    return LoanType.VALUES.has(this.code);
  }
}

export class InvalidLoanTypeException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidLoanTypeException';
  }
}