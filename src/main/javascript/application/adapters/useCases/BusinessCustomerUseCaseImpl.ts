import { BusinessCustomerPort } from '../../domain/ports/in/BusinessCustomerPort';
import { User } from '../../domain/models/User';
import { BusinessCustomer } from '../../domain/models/BusinessCustomer';
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
    return this.users.registerEmployeeUser(user, newCompanyUser);
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
