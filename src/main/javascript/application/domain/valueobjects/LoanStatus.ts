import { DomainCatalog } from './DomainCatalog';

/**
 * LoanStatus - Represents the lifecycle state of a loan.
 */
export class LoanStatus extends DomainCatalog {
  private static readonly VALUES: Map<string, LoanStatus> = new Map();

  static readonly UNDER_REVIEW = LoanStatus.create('UNDER_REVIEW', 'Under Review', 'Loan application is under evaluation');
  static readonly APPROVED = LoanStatus.create('APPROVED', 'Approved', 'Loan has been approved');
  static readonly REJECTED = LoanStatus.create('REJECTED', 'Rejected', 'Loan application has been rejected');
  static readonly DISBURSED = LoanStatus.create('DISBURSED', 'Disbursed', 'Loan amount has been disbursed');
  static readonly CLOSED = LoanStatus.create('CLOSED', 'Closed', 'Loan has been closed');

  private constructor(code: string, name: string, description: string) {
    super(code, name, description);
  }

  private static create(code: string, name: string, description: string): LoanStatus {
    const status = new LoanStatus(code, name, description);
    LoanStatus.VALUES.set(code, status);
    return status;
  }

  static fromCode(code: string): LoanStatus {
    const status = LoanStatus.VALUES.get(code);
    if (!status) {
      throw new InvalidLoanStatusException(`Invalid loan status code: ${code}`);
    }
    return status;
  }

  static getAll(): LoanStatus[] {
    return Array.from(LoanStatus.VALUES.values());
  }

  isValid(): boolean {
    return LoanStatus.VALUES.has(this.code);
  }

  canBeDisbursed(): boolean {
    return this.equals(LoanStatus.APPROVED);
  }

  canReceivePayments(): boolean {
    return this.equals(LoanStatus.DISBURSED);
  }

  canBeClosed(): boolean {
    return this.equals(LoanStatus.DISBURSED);
  }
}

export class InvalidLoanStatusException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidLoanStatusException';
  }
}