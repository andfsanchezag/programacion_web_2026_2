import { CommercialEmployeePort } from '../../domain/ports/in/CommercialEmployeePort';
import { User } from '../../domain/models/User';
import { Customer } from '../../domain/models/Customer';
import { BankAccount } from '../../domain/models/BankAccount';
import { Loan } from '../../domain/models/Loan';
import { BankingProduct } from '../../domain/models/BankingProduct';
import { CustomerService } from '../../domain/services/CustomerService';
import { BankAccountService } from '../../domain/services/BankAccountService';
import { LoanService } from '../../domain/services/LoanService';

export class CommercialEmployeeUseCaseImpl implements CommercialEmployeePort {
  constructor(
    private readonly customers: CustomerService,
    private readonly accounts: BankAccountService,
    private readonly loans: LoanService,
  ) {}
  async consultCustomer(user: User, customer: Customer): Promise<Customer> { return this.customers.consult(user, customer); }
  async updateCustomer(user: User, customer: Customer): Promise<Customer> { return this.customers.update(user, customer); }
  async consultCustomerProducts(user: User, customer: Customer): Promise<BankingProduct[]> {
    return this.customers.consultProducts(user, customer);
  }
  async requestLoanOnBehalfOfCustomer(user: User, customer: Customer, loan: Loan): Promise<Loan> {
    return this.loans.requestLoan(user, customer, loan);
  }
  async consultLoanStatus(user: User, loan: Loan): Promise<Loan> { return this.loans.consultLoan(user, loan); }
  async openBankAccount(user: User, account: BankAccount): Promise<BankAccount> {
    return this.accounts.openAccount(user, account);
  }
}
