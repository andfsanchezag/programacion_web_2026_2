import { BusinessCustomerPort } from '../../domain/ports/in/BusinessCustomerPort';
import { User } from '../../domain/models/User';
import { BusinessCustomer } from '../../domain/models/BusinessCustomer';
import { InvalidUserException } from '../../domain/exceptions/user-errors';
import { BankAccount } from '../../domain/models/BankAccount';
import { Loan } from '../../domain/models/Loan';
import { Transfer } from '../../domain/models/Transfer';
import { BankingProduct } from '../../domain/models/BankingProduct';
import { CustomerService } from '../../domain/services/CustomerService';
import { BankAccountService } from '../../domain/services/BankAccountService';
import { LoanService } from '../../domain/services/LoanService';
import { TransferService } from '../../domain/services/TransferService';
import { UserAuthenticationService } from '../../domain/services/UserAuthenticationService';

export class BusinessCustomerUseCaseImpl implements BusinessCustomerPort {
  constructor(
    private readonly customers: CustomerService,
    private readonly accounts: BankAccountService,
    private readonly loans: LoanService,
    private readonly transfers: TransferService,
    private readonly users: UserAuthenticationService,
  ) {}
  private companyOf(user: User): BusinessCustomer {
    const c = user.customer;
    if (!(c instanceof BusinessCustomer)) throw new Error('Usuario sin empresa asociada');
    return c;
  }
  async consultCompanyProfile(user: User): Promise<BusinessCustomer> {
    return this.companyOf(user);
  }
  async consultCompanyProducts(user: User): Promise<BankingProduct[]> {
    return this.customers.consultProducts(user, this.companyOf(user));
  }
  async registerCompanyUser(user: User, newCompanyUser: User): Promise<User> {
    // SDD §5.2/Input-ports: la empresa registra usuarios delegados (operativos).
    // Es un usuario de cliente asociado a la compañía, no un empleado global:
    // no requiere analista (registerEmployeeUser es solo §10.1).
    const company = this.companyOf(user);
    if (!newCompanyUser.customer || newCompanyUser.customer.customerId !== company.customerId) {
      throw new InvalidUserException('Delegated user must belong to the company');
    }
    return this.users.registerCustomerUser(newCompanyUser);
  }
  async consultCompanyAccounts(user: User): Promise<BankAccount[]> {
    return (await this.customers.consultProducts(user, this.companyOf(user)))
      .filter((p): p is BankAccount => p instanceof BankAccount);
  }
  async requestCompanyLoan(user: User, customer: BusinessCustomer, loan: Loan): Promise<Loan> {
    return this.loans.requestLoan(user, customer, loan);
  }
  async approveCompanyTransfer(user: User, transfer: Transfer): Promise<Transfer> {
    return this.transfers.approveTransfer(user, transfer);
  }
  async rejectCompanyTransfer(user: User, transfer: Transfer): Promise<Transfer> {
    return this.transfers.rejectTransfer(user, transfer);
  }
}
