import { Loan } from '../models/Loan';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { Operation } from '../models/Operation';
import { AuditLog } from '../models/AuditLog';
import { OperationType } from '../valueobjects/OperationType';
import { LoanStatus } from '../valueobjects/LoanStatus';
import { LoanRepositoryPort } from '../ports/out/LoanRepositoryPort';
import { CustomerRepositoryPort } from '../ports/out/CustomerRepositoryPort';
import { BankAccountRepositoryPort } from '../ports/out/BankAccountRepositoryPort';
import { OperationRepositoryPort } from '../ports/out/OperationRepositoryPort';
import { AuditLogRepositoryPort } from '../ports/out/AuditLogRepositoryPort';
import { AuthorizationPort } from '../ports/out/AuthorizationPort';
import {
  LoanNotFoundException,
  InvalidLoanException,
  InvalidLoanStatusException,
  InvalidLoanStatusTransitionException,
  InvalidLoanAmountException,
  InvalidLoanTermException,
  InvalidInterestRateException,
  InvalidDestinationAccountException,
  CustomerNotEligibleException,
  LoanDisbursementException,
} from '../exceptions/loan-errors';
import { UnauthorizedApprovalException } from '../exceptions/authorization-errors';
import { UnauthorizedCustomerOperationException } from '../exceptions/customer-errors';

/**
 * LoanService - Coordinates the loan lifecycle business operations.
 *
 * Every mutating service follows the validation-first pattern established by
 * `requestLoan`:
 * validate -> authorize -> execute Domain behavior -> persist the Domain
 * Model -> register Operation -> register AuditLog -> return the Domain Model.
 * External information is obtained exclusively through Output Ports, and
 * information already available in the supplied Domain Models is never
 * re-fetched unnecessarily (Architectural Constraints 13-14).
 */
export class LoanService {

  constructor(
    private readonly loanRepository: LoanRepositoryPort,
    private readonly customerRepository: CustomerRepositoryPort,
    private readonly bankAccountRepository: BankAccountRepositoryPort,
    private readonly operationRepository: OperationRepositoryPort,
    private readonly auditRepository: AuditLogRepositoryPort,
    private readonly authorizationPort: AuthorizationPort
  ) {}

  async requestLoan(requestingUser: User, customerRequest: Customer, loan: Loan): Promise<Loan> {
    // 1. Validate requesting user/context.
    this.validateRequestingUserContext(requestingUser);
    this.validateCustomerUserContext(requestingUser);
    // 2. Enrich the Domain Model: the Loan supplied by the caller is already
    //    fully populated, so no enrichment is required.
    // 3. Validate Loan-specific input.
    this.validateLoanRequest(loan);
    // 4. Validate the related Customer. Customer information is not guaranteed
    //    by the supplied Domain Model, so the persisted customer is retrieved
    //    through the CustomerRepositoryPort.
    await this.assertApplicantEligible(loan.applicant);
    // 5. Validate Customer relationship/ownership.
    this.validateCustomerRelationship(requestingUser, customerRequest, loan.applicant);
    // 6. Validate destination BankAccount relationship/ownership.
    this.validateDestinationAccountOwnership(loan);
    // 7. Validate authorization.
    if (!this.authorizationPort.canExecute(requestingUser, loan)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to request this loan'
      );
    }
    // 8. Persist the Loan before registering the Operation and AuditLog.
    const saved = await this.loanRepository.save(loan);
    // 9-10. Register Operation and AuditLog.
    await this.recordOperation(requestingUser, saved, OperationType.LOAN_APPLICATION);
    // 11. Return the Loan.
    return saved;
  }

  async consultLoan(requestingUser: User, loan: Loan): Promise<Loan> {
    // 1. Validate requesting user/context.
    this.validateRequestingUserContext(requestingUser);
    // 3. Validate product access before retrieving persisted state.
    if (!this.authorizationPort.canAccessCustomer(requestingUser, loan.applicant)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to consult this loan'
      );
    }
    // 2/4. Validate existence and retrieve the persisted Loan in a single
    //       repository read. A null result means the Loan does not exist.
    const found = await this.loanRepository.find(loan);
    if (found === null || found === undefined) {
      throw new LoanNotFoundException('Loan not found');
    }
    // 5. Return the Loan. A consultation must not mutate the Loan.
    return found;
  }

  async approveLoan(requestingUser: User, loan: Loan): Promise<Loan> {
    // 1. Validate requesting user/context.
    this.validateRequestingUserContext(requestingUser);
    // 2. Validate Loan existence.
    await this.assertExists(loan);
    // 3-4. Validate applicant and Loan approval conditions using information
    //       already available in the Domain Model (no unnecessary external calls).
    this.validateLoanAttributes(loan);
    this.assertApplicantOperational(loan.applicant);
    // 5. Validate authorization.
    if (!this.authorizationPort.canApprove(requestingUser, loan)) {
      throw new UnauthorizedApprovalException(
        'User is not authorized to approve loans'
      );
    }
    // 6. Apply the Domain transition. The approved amount belongs to the Loan
    //    Domain Model; when no amount was prepared, the requested amount is
    //    approved. loan.approve enforces the approved amount invariants.
    const approvedAmount = loan.approvedAmount !== 0 ? loan.approvedAmount : loan.requestedAmount;
    loan.approve(approvedAmount, new Date());
    // 7. Persist the Loan.
    await this.loanRepository.update(loan);
    // 8-9. Register Operation and AuditLog.
    await this.recordOperation(requestingUser, loan, OperationType.LOAN_APPROVAL);
    // 10. Return the Loan.
    return loan;
  }

  async rejectLoan(requestingUser: User, loan: Loan): Promise<Loan> {
    // 1. Validate requesting user/context.
    this.validateRequestingUserContext(requestingUser);
    // 2. Validate Loan existence.
    await this.assertExists(loan);
    // 3. Rejection does not require applicant revalidation: the decision and
    //    its conditions are covered by the Domain transition and authorization.
    // 4. Validate authorization.
    if (!this.authorizationPort.canApprove(requestingUser, loan)) {
      throw new UnauthorizedApprovalException(
        'User is not authorized to reject loans'
      );
    }
    // 5. Apply the Domain transition.
    loan.reject(new Date());
    // 6. Persist the Loan.
    await this.loanRepository.update(loan);
    // 7-8. Register Operation and AuditLog.
    await this.recordOperation(requestingUser, loan, OperationType.LOAN_REJECTION);
    // 9. Return the Loan.
    return loan;
  }

  async disburseLoan(requestingUser: User, loan: Loan): Promise<Loan> {
    // 1. Validate requesting user/context.
    this.validateRequestingUserContext(requestingUser);
    // 2. Validate Loan existence.
    await this.assertExists(loan);
    // 3. Validate Loan state/amount and destination BankAccount before any
    //    mutation, so both Domain Models stay consistent in memory.
    this.validateDisbursementConditions(loan);
    // 4. Validate authorization.
    if (!this.authorizationPort.canExecute(requestingUser, loan)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to disburse this loan'
      );
    }
    // 5. Credit the destination account through the BankAccount Domain
    //    behavior first, then apply the Loan transition. Both mutations are
    //    memory-only until the persistence step, so no partial state persists.
    const destination = loan.destinationAccount;
    destination.deposit(loan.approvedAmount);
    loan.disburse(new Date());
    // 6-7. Persist BankAccount and Loan. Sin transacción distribuida entre
    //    puertos: si el segundo update falla, se compensa el crédito ya
    //    persistido en la cuenta destino (SDD §6.1).
    await this.bankAccountRepository.update(destination);
    try {
      await this.loanRepository.update(loan);
    } catch (error) {
      destination.withdraw(loan.approvedAmount);
      await this.bankAccountRepository.update(destination);
      throw error;
    }
    // 8-9. Register Operation and AuditLog.
    await this.recordOperation(requestingUser, loan, OperationType.LOAN_DISBURSEMENT);
    // 10. Return the Loan.
    return loan;
  }

  async registerLoanPayment(requestingUser: User, loan: Loan): Promise<Loan> {
    // 1. Validate requesting user/context.
    this.validateRequestingUserContext(requestingUser);
    // 2-4. Validate Loan existence, payment conditions, and authorization.
    await this.assertCanOperate(requestingUser, loan);
    // 5. Apply Domain payment behavior.
    loan.registerPayment();
    // 6. Persist the Loan.
    await this.loanRepository.update(loan);
    // 7-8. Register Operation and AuditLog.
    await this.recordOperation(requestingUser, loan, OperationType.LOAN_PAYMENT);
    // 9. Return the Loan.
    return loan;
  }

  async closeLoan(requestingUser: User, loan: Loan): Promise<Loan> {
    // 1. Validate requesting user/context.
    this.validateRequestingUserContext(requestingUser);
    // 2. Validate Loan existence.
    await this.assertExists(loan);
    // 3. Validate closure authorization (approval-level authority per the
    //    Loan specification).
    if (!this.authorizationPort.canApprove(requestingUser, loan)) {
      throw new UnauthorizedApprovalException(
        'User is not authorized to close loans'
      );
    }
    // 4. Apply the Domain closure behavior. The Domain enforces the
    //    transition to CLOSED and its internal invariants.
    loan.close();
    // 5. Persist the Loan.
    await this.loanRepository.update(loan);
    // 6-7. Register Operation and AuditLog with a dedicated closure operation
    //       type, semantically distinct from a cancellation.
    await this.recordOperation(requestingUser, loan, OperationType.LOAN_CLOSURE);
    // 8. Return the Loan.
    return loan;
  }

  // -------- Private validation helpers --------

  private validateRequestingUserContext(requestingUser: User): void {
    // Role/status authorization decisions are delegated to the Authorization
    // subdomain through the AuthorizationPort. Here only the presence of the
    // actor is guaranteed before any other validation runs.
    if (requestingUser === null || requestingUser === undefined) {
      throw new UnauthorizedCustomerOperationException(
        'Requesting user must be provided'
      );
    }
  }

  private validateCustomerUserContext(requestingUser: User): void {
    // Customer users must operate in the context of their associated Customer.
    // Internal employees are never treated as customer users: an employee may
    // hold an associated customer without being restricted by it (their
    // relationship checks are not applied as if they were a customer).
    if (requestingUser.role.isCustomerRole() &&
        (requestingUser.customer === null || requestingUser.customer === undefined)) {
      throw new UnauthorizedCustomerOperationException(
        'User role requires an associated customer to request loans'
      );
    }
  }

  private validateLoanAttributes(loan: Loan): void {
    if (loan.applicant === null || loan.applicant === undefined) {
      throw new InvalidLoanException('Loan applicant must be provided');
    }
    if (loan.loanType === null || loan.loanType === undefined || !loan.loanType.isValid()) {
      throw new InvalidLoanException('Loan type must be valid');
    }
    if (loan.requestedAmount <= 0) {
      throw new InvalidLoanAmountException('Loan requested amount must be positive');
    }
    if (loan.termInMonths <= 0) {
      throw new InvalidLoanTermException('Loan term must be positive');
    }
    if (loan.interestRate < 0) {
      throw new InvalidInterestRateException('Loan interest rate must not be negative');
    }
    this.assertDestinationAccountProvided(loan);
  }

  private validateLoanRequest(loan: Loan): void {
    this.validateLoanAttributes(loan);
    if (loan.loanStatus === null || loan.loanStatus === undefined || !loan.loanStatus.isValid()) {
      throw new InvalidLoanStatusException('Loan initial status must be valid');
    }
    if (!loan.loanStatus.equals(LoanStatus.UNDER_REVIEW)) {
      throw new InvalidLoanStatusTransitionException(
        'A loan application must start in UNDER_REVIEW status'
      );
    }
  }

  private validateCustomerRelationship(
    requestingUser: User,
    customerRequest: Customer,
    applicant: Customer
  ): void {
    // Customer users may only operate in the context of their associated
    // Customer. Internal employees are never treated as customer users.
    if (requestingUser.role.isCustomerRole()) {
      if (requestingUser.customer === null || requestingUser.customer === undefined ||
          requestingUser.customer.customerId !== applicant.customerId) {
        throw new UnauthorizedCustomerOperationException(
          'User is not authorized to request a loan for this customer'
        );
      }
    }
    // The Customer context supplied with the request must be the applicant.
    if (customerRequest === null || customerRequest === undefined ||
        customerRequest.customerId !== applicant.customerId) {
      throw new UnauthorizedCustomerOperationException(
        'The customer context does not match the loan applicant'
      );
    }
  }

  private validateDestinationAccountOwnership(loan: Loan): void {
    this.assertDestinationAccountProvided(loan);
    if (loan.destinationAccount.owner === null ||
        loan.destinationAccount.owner.customerId !== loan.applicant.customerId) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to use this bank account for loan disbursement'
      );
    }
  }

  private assertDestinationAccountProvided(loan: Loan): void {
    if (loan.destinationAccount === null || loan.destinationAccount === undefined) {
      throw new InvalidDestinationAccountException(
        'Loan destination account must be provided'
      );
    }
  }

  private validateDisbursementConditions(loan: Loan): void {
    if (loan.approvedAmount <= 0) {
      throw new LoanDisbursementException('Loan approved amount must be positive');
    }
    if (!loan.loanStatus.equals(LoanStatus.APPROVED)) {
      throw new LoanDisbursementException('Only an approved loan can be disbursed');
    }
    this.validateDestinationAccountOwnership(loan);
    if (loan.destinationAccount.accountStatus === null ||
        loan.destinationAccount.accountStatus === undefined ||
        !loan.destinationAccount.accountStatus.isOperational()) {
      throw new LoanDisbursementException(
        'Destination account must be operational to receive the disbursement'
      );
    }
  }

  private async assertApplicantEligible(applicant: Customer): Promise<void> {
    // Reference implementation: the persisted customer is retrieved and its
    // operational status verified through the CustomerRepositoryPort.
    const stored = await this.customerRepository.findByIdentification(applicant);
    if (stored === null || stored === undefined || !stored.isOperational()) {
      throw new CustomerNotEligibleException(
        'The customer is not eligible to request a loan'
      );
    }
  }

  private assertApplicantOperational(applicant: Customer): void {
    // Uses information already available in the Domain Model; no external
    // lookup is performed (Architectural Constraint 13).
    if (applicant === null || applicant === undefined || !applicant.isOperational()) {
      throw new CustomerNotEligibleException(
        'The customer is not eligible for this loan operation'
      );
    }
  }

  private async assertCanOperate(user: User, loan: Loan): Promise<void> {
    await this.assertExists(loan);
    if (!this.authorizationPort.canExecute(user, loan)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to operate this loan'
      );
    }
  }

  private async assertExists(loan: Loan): Promise<void> {
    if (!(await this.loanRepository.exists(loan))) {
      throw new LoanNotFoundException('Loan not found');
    }
  }

  private async recordOperation(user: User, product: Loan, type: OperationType): Promise<void> {
    const operation = new Operation(this.newId(), type, new Date(), user, product);
    await this.operationRepository.save(operation);
    const audit = new AuditLog(
      this.newId(),
      type,
      new Date(),
      user,
      product,
      new Map<string, unknown>()
    );
    await this.auditRepository.save(audit);
  }

  private newId(): string {
    return `id-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }
}
