import { describe, it, expect, vi } from 'vitest';
import { LoanService } from '../../../application/domain/services/LoanService';
import { Loan } from '../../../application/domain/models/Loan';
import {
  LoanNotFoundException,
  InvalidLoanAmountException,
  InvalidLoanTermException,
  CustomerNotEligibleException,
} from '../../../application/domain/exceptions/loan-errors';
import { UnauthorizedApprovalException } from '../../../application/domain/exceptions/authorization-errors';
import { UnauthorizedCustomerOperationException } from '../../../application/domain/exceptions/customer-errors';
import { LoanStatus } from '../../../application/domain/valueobjects/LoanStatus';
import { LoanType } from '../../../application/domain/valueobjects/LoanType';
import { AccountStatus } from '../../../application/domain/valueobjects/AccountStatus';
import { SystemRole } from '../../../application/domain/valueobjects/SystemRole';
import { makeCustomer, makeUser, makeBankAccount } from '../../helpers';
import { loanRepo, customerRepo, accountRepo, operationRepo, auditRepo, authorization } from '../services/mocks';

function buildLoan(status: LoanStatus = LoanStatus.UNDER_REVIEW) {
  const loans = loanRepo();
  const customers = customerRepo();
  (customers.findByIdentification as ReturnType<typeof vi.fn>).mockImplementation((applicant) => applicant);
  (loans.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
  const accounts = accountRepo();
  const operations = operationRepo();
  const audits = auditRepo();
  const authz = authorization();
  const service = new LoanService(loans, customers, accounts, operations, audits, authz);
  return { service, loans, customers, accounts, operations, audits, authz };
}

function buildLoanModel(status: LoanStatus = LoanStatus.UNDER_REVIEW): Loan {
  const applicant = makeCustomer();
  return new Loan(
    'loan-x', applicant, LoanType.PERSONAL, 1000, 0.12, 12,
    makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0), 0, status, null, null
  );
}
describe('LoanService', () => {
  it('requests a loan for an eligible customer', () => {
    const { service, loans, operations } = buildLoan();
    const loan = buildLoanModel();
    const saved = service.requestLoan(makeUser(SystemRole.COMMERCIAL_EMPLOYEE), loan);
    expect(saved).toBe(loan);
    expect(loans.save).toHaveBeenCalledWith(loan);
    expect(operations.save).toHaveBeenCalled();
  });

  it('rejects invalid loan requests and ineligible applicants', () => {
    const { service, customers } = buildLoan();
    const zero = new Loan('loan-zero', makeCustomer(), LoanType.PERSONAL, 0, 0.12, 12, makeBankAccount(makeCustomer()), 0, LoanStatus.UNDER_REVIEW, null, null);
    expect(() => service.requestLoan(makeUser(SystemRole.COMMERCIAL_EMPLOYEE), zero)).toThrow(InvalidLoanAmountException);

    const blockedApplicant = makeCustomer();
    blockedApplicant.block();
    (customers.findByIdentification as ReturnType<typeof vi.fn>).mockReturnValue(blockedApplicant);
    expect(() => service.requestLoan(makeUser(), buildLoanModel())).toThrow(CustomerNotEligibleException);
  });

  it('approves and rejects loans only with approval authority', () => {
    const { service, authz } = buildLoan();
    const loan = buildLoanModel();
    expect(service.approveLoan(makeUser(SystemRole.INTERNAL_ANALYST), loan).loanStatus).toBe(LoanStatus.APPROVED);

    (authz.canApprove as ReturnType<typeof vi.fn>).mockReturnValue(false);
    expect(() => service.approveLoan(makeUser(SystemRole.NATURAL_CUSTOMER), buildLoanModel())).toThrow(UnauthorizedApprovalException);
    expect(() => service.rejectLoan(makeUser(SystemRole.NATURAL_CUSTOMER), buildLoanModel())).toThrow(UnauthorizedApprovalException);
  });

  it('disburses an approved loan into the destination account', () => {
    const { service, accounts } = buildLoan();
    const loan = buildLoanModel(LoanStatus.UNDER_REVIEW);
    loan.approve(1000, new Date());
    const destination = loan.destinationAccount;
    service.disburseLoan(makeUser(SystemRole.INTERNAL_ANALYST), loan);
    expect(destination.currentBalance).toBe(1000);
    expect(accounts.update).toHaveBeenCalledWith(destination);
  });

  it('registers payments on disbursed loans', () => {
    const { service } = buildLoan();
    const loan = buildLoanModel(LoanStatus.DISBURSED);
    expect(service.registerLoanPayment(makeUser(SystemRole.TELLER_EMPLOYEE), loan).loanStatus).toBe(LoanStatus.DISBURSED);
  });

  it('closes loans only with approval authority', () => {
    const { service } = buildLoan();
    const loan = buildLoanModel(LoanStatus.DISBURSED);
    expect(service.closeLoan(makeUser(SystemRole.INTERNAL_ANALYST), loan).loanStatus).toBe(LoanStatus.CLOSED);
  });
});