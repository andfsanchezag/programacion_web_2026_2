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
    makeBankAccount(applicant, AccountStatus.ACTIVE, 0), 0, status, null, null
  );
}
describe('LoanService', () => {
  it('requests a loan for an eligible customer', async () => {
    const { service, loans, operations } = buildLoan();
    const loan = buildLoanModel();
    const saved = await service.requestLoan(makeUser(SystemRole.COMMERCIAL_EMPLOYEE), loan.applicant, loan);
    expect(saved).toBe(loan);
    expect(loans.save).toHaveBeenCalledWith(loan);
    expect(operations.save).toHaveBeenCalled();
  });

  it('rejects invalid loan requests and ineligible applicants', async () => {
    const { service, customers } = buildLoan();
    const zeroApplicant = makeCustomer();
    const zero = new Loan('loan-zero', zeroApplicant, LoanType.PERSONAL, 0, 0.12, 12, makeBankAccount(zeroApplicant, AccountStatus.ACTIVE, 0), 0, LoanStatus.UNDER_REVIEW, null, null);
    await expect(service.requestLoan(makeUser(SystemRole.COMMERCIAL_EMPLOYEE), zeroApplicant, zero)).rejects.toThrow(InvalidLoanAmountException);

    const blockedApplicant = makeCustomer();
    blockedApplicant.block();
    (customers.findByIdentification as ReturnType<typeof vi.fn>).mockReturnValue(blockedApplicant);
    const blockedLoan = new Loan(
      'loan-blocked', blockedApplicant, LoanType.PERSONAL, 1000, 0.12, 12,
      makeBankAccount(blockedApplicant, AccountStatus.ACTIVE, 0), 0, LoanStatus.UNDER_REVIEW, null, null
    );
    await expect(service.requestLoan(
      makeUser(SystemRole.NATURAL_CUSTOMER, blockedApplicant),
      blockedApplicant,
      blockedLoan
    )).rejects.toThrow(CustomerNotEligibleException);
  });

  it('approves and rejects loans only with approval authority', async () => {
    const { service, authz } = buildLoan();
    const loan = buildLoanModel();
    expect((await service.approveLoan(makeUser(SystemRole.INTERNAL_ANALYST), loan)).loanStatus).toBe(LoanStatus.APPROVED);

    (authz.canApprove as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(service.approveLoan(makeUser(SystemRole.NATURAL_CUSTOMER), buildLoanModel())).rejects.toThrow(UnauthorizedApprovalException);
    await expect(service.rejectLoan(makeUser(SystemRole.NATURAL_CUSTOMER), buildLoanModel())).rejects.toThrow(UnauthorizedApprovalException);
  });

  it('disburses an approved loan into the destination account', async () => {
    const { service, accounts } = buildLoan();
    const loan = buildLoanModel(LoanStatus.UNDER_REVIEW);
    loan.approve(1000, new Date());
    const destination = loan.destinationAccount;
    await service.disburseLoan(makeUser(SystemRole.INTERNAL_ANALYST), loan);
    expect(destination.currentBalance).toBe(1000);
    expect(accounts.update).toHaveBeenCalledWith(destination);
  });

  it('registers payments on disbursed loans', async () => {
    const { service } = buildLoan();
    const loan = buildLoanModel(LoanStatus.DISBURSED);
    expect((await service.registerLoanPayment(makeUser(SystemRole.TELLER_EMPLOYEE), loan)).loanStatus).toBe(LoanStatus.DISBURSED);
  });

  it('closes loans only with approval authority', async () => {
    const { service } = buildLoan();
    const loan = buildLoanModel(LoanStatus.DISBURSED);
    expect((await service.closeLoan(makeUser(SystemRole.INTERNAL_ANALYST), loan)).loanStatus).toBe(LoanStatus.CLOSED);
  });

  it('consults an existing loan without registering operations', async () => {
    const { service, loans, operations, audits } = buildLoan();
    const loan = buildLoanModel(LoanStatus.DISBURSED);
    (loans.find as ReturnType<typeof vi.fn>).mockReturnValue(loan);
    expect(await service.consultLoan(makeUser(SystemRole.INTERNAL_ANALYST), loan)).toBe(loan);
    expect(operations.save).not.toHaveBeenCalled();
    expect(audits.save).not.toHaveBeenCalled();
  });

  it('throws when the consulted loan does not exist', async () => {
    const { service, loans } = buildLoan();
    (loans.exists as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(service.consultLoan(makeUser(SystemRole.INTERNAL_ANALYST), buildLoanModel())).rejects.toThrow(LoanNotFoundException);
  });

  it('denies consultation without product access', async () => {
    const { service, authz } = buildLoan();
    (authz.canAccessCustomer as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(service.consultLoan(makeUser(SystemRole.NATURAL_CUSTOMER), buildLoanModel())).rejects.toThrow(UnauthorizedCustomerOperationException);
  });
});