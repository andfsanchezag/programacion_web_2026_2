import { InternalAnalystPort } from '../../domain/ports/in/InternalAnalystPort';
import { User } from '../../domain/models/User';
import { Customer } from '../../domain/models/Customer';
import { Loan } from '../../domain/models/Loan';
import { Operation } from '../../domain/models/Operation';
import { AuditLog } from '../../domain/models/AuditLog';
import { BankingProduct } from '../../domain/models/BankingProduct';
import { UserAuthenticationService } from '../../domain/services/UserAuthenticationService';
import { CustomerService } from '../../domain/services/CustomerService';
import { LoanService } from '../../domain/services/LoanService';
import { OperationAuditService } from '../../domain/services/OperationAuditService';

export class InternalAnalystUseCaseImpl implements InternalAnalystPort {
  constructor(
    private readonly users: UserAuthenticationService,
    private readonly customers: CustomerService,
    private readonly loans: LoanService,
    private readonly audit: OperationAuditService,
  ) {}
  async registerEmployeeUser(user: User, newEmployee: User): Promise<User> {
    return this.users.registerEmployeeUser(user, newEmployee);
  }
  async changeCustomerStatus(user: User, customer: Customer): Promise<Customer> {
    return this.customers.changeStatus(user, customer);
  }
  async changeUserStatus(user: User, targetUser: User): Promise<User> {
    return this.users.changeStatus(user, targetUser);
  }
  async approveLoan(user: User, loan: Loan): Promise<Loan> { return this.loans.approveLoan(user, loan); }
  async rejectLoan(user: User, loan: Loan): Promise<Loan> { return this.loans.rejectLoan(user, loan); }
  async disburseLoan(user: User, loan: Loan): Promise<Loan> { return this.loans.disburseLoan(user, loan); }
  async closeLoan(user: User, loan: Loan): Promise<Loan> { return this.loans.closeLoan(user, loan); }
  async consultAuditLog(user: User, product: BankingProduct): Promise<AuditLog[]> {
    return this.audit.consultAuditLog(user, product);
  }
  async consultAllOperations(user: User, product: BankingProduct): Promise<Operation[]> {
    return this.audit.consultOperations(user, product);
  }
}
