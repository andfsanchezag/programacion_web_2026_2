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

  it('rolls back the credited account when the loan update fails on disburse', async () => {
    const { service, accounts, loans } = buildLoan();
    const loan = buildLoanModel(LoanStatus.UNDER_REVIEW);
    loan.approve(1000, new Date());
    const destination = loan.destinationAccount;
    (loans.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('db down'));
    await expect(service.disburseLoan(makeUser(SystemRole.INTERNAL_ANALYST), loan)).rejects.toThrow('db down');
    expect(destination.currentBalance).toBe(0);
    expect(accounts.update).toHaveBeenCalledTimes(2);
  });

  it('validates actor context, attributes and relationships on request', async () => {
    const { service, customers } = buildLoan();
    const applicant = makeCustomer();
    const dest = (a: ReturnType<typeof makeCustomer>) =>
      makeBankAccount(a, AccountStatus.ACTIVE, 0);
    // Usuario cliente sin cliente asociado.
    const loner = new Loan('lz', applicant, LoanType.PERSONAL, 100, 0.1, 6, dest(applicant));
    await expect(service.requestLoan(makeUser(SystemRole.NATURAL_CUSTOMER), applicant, loner))
      .rejects.toThrow('associated customer');
    // Tasa negativa y plazo cero.
    const me = makeUser(SystemRole.COMMERCIAL_EMPLOYEE);
    const neg = new Loan('ln', applicant, LoanType.PERSONAL, 100, -0.5, 6, dest(applicant));
    await expect(service.requestLoan(me, applicant, neg)).rejects.toThrow('interest rate');
    const zeroTerm = new Loan('lt', applicant, LoanType.PERSONAL, 100, 0.1, 0, dest(applicant));
    await expect(service.requestLoan(me, applicant, zeroTerm)).rejects.toThrow('term');
    // Estado inicial distinto de UNDER_REVIEW.
    const pre = new Loan('lp', applicant, LoanType.PERSONAL, 100, 0.1, 6, dest(applicant),
      0, LoanStatus.APPROVED, null, null);
    await expect(service.requestLoan(me, applicant, pre)).rejects.toThrow('UNDER_REVIEW');
    // Estado inicial nulo y cuenta destino ausente.
    const noStatus = new Loan('lns', applicant, LoanType.PERSONAL, 100, 0.1, 6, dest(applicant),
      0, null as never, null, null);
    await expect(service.requestLoan(me, applicant, noStatus)).rejects.toThrow('initial status');
    const noDest = new Loan('lnd', applicant, LoanType.PERSONAL, 100, 0.1, 6, null as never);
    await expect(service.requestLoan(me, applicant, noDest)).rejects.toThrow('destination account');
    // Customer context distinto del solicitante.
    const other = makeCustomer();
    const ok = new Loan('lo', applicant, LoanType.PERSONAL, 100, 0.1, 6, dest(applicant));
    await expect(service.requestLoan(me, other, ok)).rejects.toThrow('does not match');
    // Cuenta destino de otro dueño.
    const foreign = new Loan('lf', applicant, LoanType.PERSONAL, 100, 0.1, 6, dest(makeCustomer()));
    await expect(service.requestLoan(me, applicant, foreign)).rejects.toThrow('disbursement');
    // Solicitante inexistente en el repositorio.
    (customers.findByIdentification as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(service.requestLoan(me, applicant, ok)).rejects.toThrow('not eligible');
    // Solicitante y tipo inválidos.
    const noApplicant = new Loan('lna', null as never, LoanType.PERSONAL, 100, 0.1, 6, dest(applicant));
    await expect(service.requestLoan(me, applicant, noApplicant)).rejects.toThrow('applicant');
    const badType = new Loan('lnt', applicant, null as never, 100, 0.1, 6, dest(applicant));
    await expect(service.requestLoan(me, applicant, badType)).rejects.toThrow('Loan type');
  });

  it('validates disburse preconditions and close/payment authorization', async () => {
    const { service, loans, authz } = buildLoan();
    const applicant = makeCustomer();
    const dest = makeBankAccount(applicant, AccountStatus.ACTIVE, 0);
    // Monto aprobado cero con estado APPROVED forzado.
    const zeroAppr = new Loan('lz2', applicant, LoanType.PERSONAL, 1000, 0.1, 12, dest,
      0, LoanStatus.APPROVED, new Date(), null);
    await expect(service.disburseLoan(makeUser(SystemRole.INTERNAL_ANALYST), zeroAppr))
      .rejects.toThrow('approved amount');
    // Destino no operativo.
    const blocked = makeBankAccount(applicant, AccountStatus.BLOCKED, 0);
    const toBlocked = new Loan('lb2', applicant, LoanType.PERSONAL, 1000, 0.1, 12, blocked,
      1000, LoanStatus.APPROVED, new Date(), null);
    await expect(service.disburseLoan(makeUser(SystemRole.INTERNAL_ANALYST), toBlocked))
      .rejects.toThrow('operational');
    // Préstamo inexistente y actor sin permiso.
    (loans.exists as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    await expect(service.consultLoan(makeUser(), buildLoanModel())).rejects.toThrow('not found');
    (loans.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (authz.canExecute as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(service.registerLoanPayment(makeUser(SystemRole.TELLER_EMPLOYEE), buildLoanModel(LoanStatus.DISBURSED)))
      .rejects.toThrow('not authorized to operate');
    (authz.canExecute as ReturnType<typeof vi.fn>).mockReturnValue(true);
    // Pago sobre préstamo no desembolsado.
    await expect(service.registerLoanPayment(makeUser(SystemRole.TELLER_EMPLOYEE), buildLoanModel()))
      .rejects.toThrow();
    // Cierre sin autoridad de aprobación.
    (authz.canApprove as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(service.closeLoan(makeUser(SystemRole.NATURAL_CUSTOMER), buildLoanModel(LoanStatus.DISBURSED)))
      .rejects.toThrow('not authorized to close');
  });

  it('registers payments on disbursed loans', async () => {
    const { service } = buildLoan();
    const loan = buildLoanModel(LoanStatus.DISBURSED);
    expect((await service.registerLoanPayment(makeUser(SystemRole.TELLER_EMPLOYEE), loan)).loanStatus).toBe(LoanStatus.DISBURSED);
  });

  it('rejects disburse without approval and approve for blocked applicants', async () => {    const { service } = buildLoan();
    const applicant = makeCustomer();
    const dest = makeBankAccount(applicant, AccountStatus.ACTIVE, 0);
    const notApproved = new Loan('lnp', applicant, LoanType.PERSONAL, 1000, 0.1, 12, dest,
      500, LoanStatus.UNDER_REVIEW, null, null);
    await expect(service.disburseLoan(makeUser(SystemRole.INTERNAL_ANALYST), notApproved))
      .rejects.toThrow('approved loan');
    const blockedApplicant = makeCustomer();
    blockedApplicant.block();
    const blockedLoan = new Loan('lnb', blockedApplicant, LoanType.PERSONAL, 1000, 0.1, 12,
      makeBankAccount(blockedApplicant, AccountStatus.ACTIVE, 0));
    await expect(service.approveLoan(makeUser(SystemRole.INTERNAL_ANALYST), blockedLoan))
      .rejects.toThrow('eligible');
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

  it('rejects requests from customers operating for another applicant', async () => {    const { service } = buildLoan();
    const applicant = makeCustomer();
    const other = makeCustomer();
    const actor = makeUser(SystemRole.NATURAL_CUSTOMER, other);
    const loan = new Loan('lx', applicant, LoanType.PERSONAL, 100, 0.1, 6,
      makeBankAccount(applicant, AccountStatus.ACTIVE, 0));
    await expect(service.requestLoan(actor, applicant, loan)).rejects.toThrow('for this customer');
  });

  it('approves a prepared amount instead of the requested one', async () => {
    const { service } = buildLoan();
    const applicant = makeCustomer();
    const dest = makeBankAccount(applicant, AccountStatus.ACTIVE, 0);
    const prepared = new Loan('lpa', applicant, LoanType.PERSONAL, 1000, 0.1, 12, dest,
      600, LoanStatus.UNDER_REVIEW, null, null);
    const approved = await service.approveLoan(makeUser(SystemRole.INTERNAL_ANALYST), prepared);
    expect(approved.loanStatus).toBe(LoanStatus.APPROVED);
    expect(approved.approvedAmount).toBe(600);
  });

  it('requires a requesting user for loan operations', async () => {
    const { service } = buildLoan();
    const applicant = makeCustomer();
    const loan = new Loan('lnu', applicant, LoanType.PERSONAL, 100, 0.1, 6,
      makeBankAccount(applicant, AccountStatus.ACTIVE, 0));
    await expect(service.requestLoan(null as never, applicant, loan)).rejects.toThrow('must be provided');
    await expect(service.closeLoan(undefined as never, loan)).rejects.toThrow('must be provided');
  });
});