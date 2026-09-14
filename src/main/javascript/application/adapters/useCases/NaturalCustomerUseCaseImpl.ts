import { NaturalCustomerPort } from '../../domain/ports/in/NaturalCustomerPort';
import { User } from '../../domain/models/User';
import { Customer } from '../../domain/models/Customer';
import { BankAccount } from '../../domain/models/BankAccount';
import { Loan } from '../../domain/models/Loan';
import { Transfer } from '../../domain/models/Transfer';
import { Operation } from '../../domain/models/Operation';
import { BankingProduct } from '../../domain/models/BankingProduct';
import { CustomerService } from '../../domain/services/CustomerService';
import { BankAccountService } from '../../domain/services/BankAccountService';
import { LoanService } from '../../domain/services/LoanService';
import { TransferService } from '../../domain/services/TransferService';
import { OperationAuditService } from '../../domain/services/OperationAuditService';

export class NaturalCustomerUseCaseImpl implements NaturalCustomerPort {
  constructor(
    private readonly customers: CustomerService,
    private readonly accounts: BankAccountService,
    private readonly loans: LoanService,
    private readonly transfers: TransferService,
    private readonly audit: OperationAuditService,
  ) {}
  private customerOf(user: User): Customer {
    if (!user.customer) throw new Error('Usuario sin cliente asociado');
    return user.customer;
  }
  async consultMyProfile(user: User): Promise<Customer> { return this.customers.consult(user, this.customerOf(user)); }
  async updateMyProfile(user: User, customer: Customer): Promise<Customer> { return this.customers.update(user, customer); }
  async consultMyProducts(user: User): Promise<BankingProduct[]> {
    return this.customers.consultProducts(user, this.customerOf(user));
  }
  async consultMyAccounts(user: User): Promise<BankAccount[]> {
    return (await this.customers.consultProducts(user, this.customerOf(user)))
      .filter((p): p is BankAccount => p instanceof BankAccount);
  }
  async consultAccountBalance(user: User, account: BankAccount): Promise<number> {
    return this.accounts.consultBalance(user, account);
  }
  async requestLoan(user: User, customer: Customer, loan: Loan): Promise<Loan> {
    return this.loans.requestLoan(user, customer, loan);
  }
  async consultLoan(user: User, loan: Loan): Promise<Loan> { return this.loans.consultLoan(user, loan); }
  async registerLoanPayment(user: User, loan: Loan): Promise<Loan> { return this.loans.registerLoanPayment(user, loan); }
  async createTransfer(user: User, transfer: Transfer): Promise<Transfer> {
    return this.transfers.createTransfer(user, transfer);
  }
  async executeTransfer(user: User, transfer: Transfer): Promise<Transfer> {
    return this.transfers.executeTransfer(user, transfer);
  }
  async consultMyOperations(user: User, product: BankingProduct): Promise<Operation[]> {
    return this.audit.consultOperations(user, product);
  }
}
