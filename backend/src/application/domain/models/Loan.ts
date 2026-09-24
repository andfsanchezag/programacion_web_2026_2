import { BankingProduct } from './BankingProduct';
import { Customer } from './Customer';
import { BankAccount } from './BankAccount';
import { LoanType } from '../valueobjects/LoanType';
import { LoanStatus } from '../valueobjects/LoanStatus';
import {
  InvalidLoanStatusTransitionException,
  LoanAlreadyApprovedException,
  LoanAlreadyRejectedException,
  LoanAlreadyDisbursedException,
  LoanAlreadyClosedException,
  InvalidApprovedAmountException,
  InvalidLoanStatusException,
} from '../exceptions/loan-errors';

/**
 * Loan - A credit product requested by a customer.
 */
export class Loan extends BankingProduct {
  private readonly _applicant: Customer;
  private readonly _loanType: LoanType;
  private readonly _requestedAmount: number;
  private _approvedAmount: number;
  private readonly _interestRate: number;
  private readonly _termInMonths: number;
  private _loanStatus: LoanStatus;
  private _approvalDate: Date | null;
  private _disbursementDate: Date | null;
  private readonly _destinationAccount: BankAccount;

  constructor(
    identifier: string,
    applicant: Customer,
    loanType: LoanType,
    requestedAmount: number,
    interestRate: number,
    termInMonths: number,
    destinationAccount: BankAccount,
    approvedAmount: number = 0,
    loanStatus: LoanStatus = LoanStatus.UNDER_REVIEW,
    approvalDate: Date | null = null,
    disbursementDate: Date | null = null
  ) {
    super(identifier);
    this._applicant = applicant;
    this._loanType = loanType;
    this._requestedAmount = requestedAmount;
    this._approvedAmount = approvedAmount;
    this._interestRate = interestRate;
    this._termInMonths = termInMonths;
    this._loanStatus = loanStatus;
    this._approvalDate = approvalDate;
    this._disbursementDate = disbursementDate;
    this._destinationAccount = destinationAccount;
  }

  get applicant(): Customer {
    return this._applicant;
  }

  get loanType(): LoanType {
    return this._loanType;
  }

  get requestedAmount(): number {
    return this._requestedAmount;
  }

  get approvedAmount(): number {
    return this._approvedAmount;
  }

  get interestRate(): number {
    return this._interestRate;
  }

  get termInMonths(): number {
    return this._termInMonths;
  }

  get loanStatus(): LoanStatus {
    return this._loanStatus;
  }

  get approvalDate(): Date | null {
    return this._approvalDate;
  }

  get disbursementDate(): Date | null {
    return this._disbursementDate;
  }

  get destinationAccount(): BankAccount {
    return this._destinationAccount;
  }

  approve(approvedAmount: number, approvalDate: Date): void {
    this.assertStatus(LoanStatus.UNDER_REVIEW);
    if (approvedAmount <= 0 || approvedAmount > this._requestedAmount) {
      throw new InvalidApprovedAmountException(
        'Approved amount must be positive and must not exceed the requested amount'
      );
    }
    this._approvedAmount = approvedAmount;
    this._approvalDate = approvalDate;
    this._loanStatus = LoanStatus.APPROVED;
  }

  reject(approvalDate: Date): void {
    if (this._loanStatus.equals(LoanStatus.REJECTED)) {
      throw new LoanAlreadyRejectedException('Loan has already been rejected');
    }
    if (this._loanStatus.equals(LoanStatus.DISBURSED) || this._loanStatus.equals(LoanStatus.CLOSED)) {
      throw new InvalidLoanStatusTransitionException('A disbursed or closed loan cannot be rejected');
    }
    this._loanStatus = LoanStatus.REJECTED;
    this._approvalDate = approvalDate;
  }

  disburse(disbursementDate: Date): void {
    if (this._loanStatus.equals(LoanStatus.DISBURSED)) {
      throw new LoanAlreadyDisbursedException('Loan has already been disbursed');
    }
    if (this._loanStatus.equals(LoanStatus.REJECTED)) {
      throw new InvalidLoanStatusTransitionException('A rejected loan cannot be disbursed');
    }
    if (!this._loanStatus.equals(LoanStatus.APPROVED)) {
      throw new InvalidLoanStatusTransitionException('Only an approved loan can be disbursed');
    }
    this._disbursementDate = disbursementDate;
    this._loanStatus = LoanStatus.DISBURSED;
  }

  registerPayment(): void {
    this.assertStatus(LoanStatus.DISBURSED);
  }

  close(): void {
    if (this._loanStatus.equals(LoanStatus.CLOSED)) {
      throw new LoanAlreadyClosedException('Loan has already been closed');
    }
    if (this._loanStatus.equals(LoanStatus.REJECTED) || this._loanStatus.equals(LoanStatus.APPROVED)) {
      throw new InvalidLoanStatusTransitionException(
        'A loan must be disbursed before it can be closed'
      );
    }
    this._loanStatus = LoanStatus.CLOSED;
  }

  private assertStatus(expected: LoanStatus): void {
    if (!this._loanStatus.equals(expected)) {
      throw new InvalidLoanStatusException(
        `Loan must be in status ${expected.code}`
      );
    }
  }
}