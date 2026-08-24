import { describe, it, expect } from 'vitest';
import { Loan } from '../../../application/domain/models/Loan';
import {
  InvalidApprovedAmountException,
  LoanAlreadyRejectedException,
  LoanAlreadyDisbursedException,
  LoanAlreadyClosedException,
  InvalidLoanStatusTransitionException,
  InvalidLoanStatusException,
} from '../../../application/domain/exceptions/loan-errors';
import { LoanStatus } from '../../../application/domain/valueobjects/LoanStatus';
import { LoanType } from '../../../application/domain/valueobjects/LoanType';
import { NOW, makeCustomer, makeBankAccount } from '../../helpers';

const APPROVAL = new Date('2026-09-01T10:00:00Z');
const DISBURSEMENT = new Date('2026-09-02T10:00:00Z');

function make(status: LoanStatus = LoanStatus.UNDER_REVIEW): Loan {
  return new Loan(
    'loan-1', makeCustomer(), LoanType.PERSONAL, 1000, 0.12, 12,
    makeBankAccount(makeCustomer(), undefined as never), 0, status, null, null
  );
}

describe('Loan', () => {
  it('exposes attributes', () => {
    const loan = make();
    expect(loan.identifier).toBe('loan-1');
    expect(loan.loanType).toBe(LoanType.PERSONAL);
    expect(loan.requestedAmount).toBe(1000);
    expect(loan.interestRate).toBe(0.12);
    expect(loan.termInMonths).toBe(12);
    expect(loan.loanStatus).toBe(LoanStatus.UNDER_REVIEW);
    expect(loan.approvalDate).toBeNull();
    expect(loan.disbursementDate).toBeNull();
    expect(loan.applicant.customerId.length).toBeGreaterThan(0);
    expect(loan.destinationAccount.identifier).toContain('acc-');
  });

  it('approves a loan under review with valid amount', () => {
    const loan = make();
    loan.approve(800, APPROVAL);
    expect(loan.loanStatus).toBe(LoanStatus.APPROVED);
    expect(loan.approvedAmount).toBe(800);
    expect(loan.approvalDate).toBe(APPROVAL);
  });

  it('rejects invalid approved amounts', () => {
    const loan = make();
    expect(() => loan.approve(0, APPROVAL)).toThrow(InvalidApprovedAmountException);
    expect(() => loan.approve(2000, APPROVAL)).toThrow(InvalidApprovedAmountException);
  });

  it('only approves loans under review', () => {
    const approved = make(LoanStatus.APPROVED);
    expect(() => approved.approve(500, APPROVAL)).toThrow(InvalidLoanStatusException);
  });

  it('rejects a loan under review or pending', () => {
    const loan = make();
    loan.reject(APPROVAL);
    expect(loan.loanStatus).toBe(LoanStatus.REJECTED);
    expect(loan.approvalDate).toBe(APPROVAL);
  });

  it('prevents rejecting already rejected or disbursed loans', () => {
    const rejected = make(LoanStatus.REJECTED);
    expect(() => rejected.reject(APPROVAL)).toThrow(LoanAlreadyRejectedException);
    const disbursed = make(LoanStatus.DISBURSED);
    expect(() => disbursed.reject(APPROVAL)).toThrow(InvalidLoanStatusTransitionException);
    const closed = make(LoanStatus.CLOSED);
    expect(() => closed.reject(APPROVAL)).toThrow(InvalidLoanStatusTransitionException);
  });

  it('disburses only an approved loan once', () => {
    const loan = make();
    loan.approve(1000, APPROVAL);
    loan.disburse(DISBURSEMENT);
    expect(loan.loanStatus).toBe(LoanStatus.DISBURSED);
    expect(loan.disbursementDate).toBe(DISBURSEMENT);
    expect(() => loan.disburse(DISBURSEMENT)).toThrow(LoanAlreadyDisbursedException);
  });

  it('prevents disbursement of non-approved loans', () => {
    expect(() => make(LoanStatus.UNDER_REVIEW).disburse(DISBURSEMENT)).toThrow(InvalidLoanStatusTransitionException);
    expect(() => make(LoanStatus.REJECTED).disburse(DISBURSEMENT)).toThrow(InvalidLoanStatusTransitionException);
  });

  it('registers payments only on disbursed loans', () => {
    const disbursed = make(LoanStatus.DISBURSED);
    expect(() => disbursed.registerPayment()).not.toThrow();
    expect(() => make(LoanStatus.UNDER_REVIEW).registerPayment()).toThrow(InvalidLoanStatusException);
  });

  it('closes a disbursed loan once', () => {
    const loan = make(LoanStatus.DISBURSED);
    loan.close();
    expect(loan.loanStatus).toBe(LoanStatus.CLOSED);
    expect(() => loan.close()).toThrow(LoanAlreadyClosedException);
  });

  it('prevents closing rejected or approved loans', () => {
    expect(() => make(LoanStatus.REJECTED).close()).toThrow(InvalidLoanStatusTransitionException);
    expect(() => make(LoanStatus.APPROVED).close()).toThrow(InvalidLoanStatusTransitionException);
  });
});