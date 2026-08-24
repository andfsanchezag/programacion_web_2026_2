import { Loan } from '../models/Loan';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { Operation } from '../models/Operation';
import { AuditLog } from '../models/AuditLog';
import { OperationType } from '../valueobjects/OperationType';
import { LoanRepositoryPort } from '../ports/out/LoanRepositoryPort';
import { CustomerRepositoryPort } from '../ports/out/CustomerRepositoryPort';
import { BankAccountRepositoryPort } from '../ports/out/BankAccountRepositoryPort';
import { OperationRepositoryPort } from '../ports/out/OperationRepositoryPort';
import { AuditLogRepositoryPort } from '../ports/out/AuditLogRepositoryPort';
import { AuthorizationPort } from '../ports/out/AuthorizationPort';
import { RequestLoanUseCase } from '../ports/in/RequestLoanUseCase';
import { ApproveLoanUseCase } from '../ports/in/ApproveLoanUseCase';
import { RejectLoanUseCase } from '../ports/in/RejectLoanUseCase';
import { DisburseLoanUseCase } from '../ports/in/DisburseLoanUseCase';
import { RegisterLoanPaymentUseCase } from '../ports/in/RegisterLoanPaymentUseCase';
import { CloseLoanUseCase } from '../ports/in/CloseLoanUseCase';
import {
  LoanNotFoundException,
  InvalidLoanAmountException,
  InvalidLoanTermException,
  CustomerNotEligibleException,
  LoanDisbursementException,
} from '../exceptions/loan-errors';
import { UnauthorizedApprovalException } from '../exceptions/authorization-errors';
import { UnauthorizedCustomerOperationException } from '../exceptions/customer-errors';

/**
 * LoanService - Coordinates the loan lifecycle business operations.
 */
export class LoanService implements
  RequestLoanUseCase,
  ApproveLoanUseCase,
  RejectLoanUseCase,
  DisburseLoanUseCase,
  RegisterLoanPaymentUseCase,
  CloseLoanUseCase {

  constructor(
    private readonly loanRepository: LoanRepositoryPort,
    private readonly customerRepository: CustomerRepositoryPort,
    private readonly bankAccountRepository: BankAccountRepositoryPort,
    private readonly operationRepository: OperationRepositoryPort,
    private readonly auditRepository: AuditLogRepositoryPort,
    private readonly authorizationPort: AuthorizationPort
  ) {}

  requestLoan(requestingUser: User, loan: Loan): Loan {
    this.validateLoanRequest(loan);
    this.assertApplicantEligible(loan.applicant);
    if (!this.authorizationPort.canExecute(requestingUser, loan)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to request this loan'
      );
    }
    const saved = this.loanRepository.save(loan);
    this.recordOperation(requestingUser, saved, OperationType.LOAN_APPLICATION);
    return saved;
  }

  approveLoan(requestingUser: User, loan: Loan): Loan {
    if (!this.authorizationPort.canApprove(requestingUser, loan)) {
      throw new UnauthorizedApprovalException(
        'User is not authorized to approve loans'
      );
    }
    loan.approve(loan.requestedAmount, new Date());
    this.loanRepository.update(loan);
    this.recordOperation(requestingUser, loan, OperationType.LOAN_APPROVAL);
    return loan;
  }

  rejectLoan(requestingUser: User, loan: Loan): Loan {
    if (!this.authorizationPort.canApprove(requestingUser, loan)) {
      throw new UnauthorizedApprovalException(
        'User is not authorized to reject loans'
      );
    }
    this.assertExists(loan);
    loan.reject(new Date());
    this.loanRepository.update(loan);
    this.recordOperation(requestingUser, loan, OperationType.LOAN_REJECTION);
    return loan;
  }

  disburseLoan(requestingUser: User, loan: Loan): Loan {
    if (!this.authorizationPort.canExecute(requestingUser, loan)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to disburse this loan'
      );
    }
    this.assertExists(loan);
    loan.disburse(new Date());
    const destination = loan.destinationAccount;
    destination.deposit(loan.approvedAmount);
    this.bankAccountRepository.update(destination);
    this.loanRepository.update(loan);
    this.recordOperation(requestingUser, loan, OperationType.LOAN_DISBURSEMENT);
    return loan;
  }

  registerLoanPayment(requestingUser: User, loan: Loan): Loan {
    this.assertCanOperate(requestingUser, loan);
    loan.registerPayment();
    this.loanRepository.update(loan);
    this.recordOperation(requestingUser, loan, OperationType.LOAN_PAYMENT);
    return loan;
  }

  closeLoan(requestingUser: User, loan: Loan): Loan {
    if (!this.authorizationPort.canApprove(requestingUser, loan)) {
      throw new UnauthorizedApprovalException(
        'User is not authorized to close loans'
      );
    }
    this.assertExists(loan);
    loan.close();
    this.loanRepository.update(loan);
    this.recordOperation(requestingUser, loan, OperationType.LOAN_CANCELLATION);
    return loan;
  }

  private validateLoanRequest(loan: Loan): void {
    if (loan.requestedAmount <= 0) {
      throw new InvalidLoanAmountException('Loan requested amount must be positive');
    }
    if (loan.termInMonths <= 0) {
      throw new InvalidLoanTermException('Loan term must be positive');
    }
    if (loan.interestRate < 0) {
      throw new InvalidLoanAmountException('Loan interest rate must not be negative');
    }
  }

  private assertApplicantEligible(applicant: Customer): void {
    const stored = this.customerRepository.findByIdentification(applicant);
    if (stored === null || stored === undefined || !stored.isOperational()) {
      throw new CustomerNotEligibleException(
        'The customer is not eligible to request a loan'
      );
    }
  }

  private assertCanOperate(user: User, loan: Loan): void {
    this.assertExists(loan);
    if (!this.authorizationPort.canExecute(user, loan)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to operate this loan'
      );
    }
  }

  private assertExists(loan: Loan): void {
    if (!this.loanRepository.exists(loan)) {
      throw new LoanNotFoundException('Loan not found');
    }
  }

  private recordOperation(user: User, product: Loan, type: OperationType): void {
    const operation = new Operation(this.newId(), type, new Date(), user, product);
    this.operationRepository.save(operation);
    const audit = new AuditLog(
      this.newId(),
      type,
      new Date(),
      user,
      product,
      new Map<string, unknown>()
    );
    this.auditRepository.save(audit);
  }

  private newId(): string {
    return `id-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }
}