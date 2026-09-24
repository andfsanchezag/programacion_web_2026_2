import { TellerEmployeePort } from '../../domain/ports/in/TellerEmployeePort';
import { User } from '../../domain/models/User';
import { Customer } from '../../domain/models/Customer';
import { BankAccount } from '../../domain/models/BankAccount';
import { CustomerService } from '../../domain/services/CustomerService';
import { BankAccountService } from '../../domain/services/BankAccountService';

export class TellerEmployeeUseCaseImpl implements TellerEmployeePort {
  constructor(
    private readonly customers: CustomerService,
    private readonly accounts: BankAccountService,
  ) {}
  async consultCustomer(user: User, customer: Customer): Promise<Customer> { return this.customers.consult(user, customer); }
  async openBankAccount(user: User, account: BankAccount): Promise<BankAccount> {
    return this.accounts.openAccount(user, account);
  }
  async consultBankAccount(user: User, account: BankAccount): Promise<BankAccount> {
    return this.accounts.consult(user, account);
  }
  async consultAccountBalance(user: User, account: BankAccount): Promise<number> {
    return this.accounts.consultBalance(user, account);
  }
  async depositFunds(user: User, account: BankAccount, amount: number): Promise<BankAccount> {
    return this.accounts.deposit(user, account, amount);
  }
  async withdrawFunds(user: User, account: BankAccount, amount: number): Promise<BankAccount> {
    return this.accounts.withdraw(user, account, amount);
  }
  async blockBankAccount(user: User, account: BankAccount): Promise<BankAccount> { return this.accounts.block(user, account); }
  async unblockBankAccount(user: User, account: BankAccount): Promise<BankAccount> { return this.accounts.unblock(user, account); }
  async closeBankAccount(user: User, account: BankAccount): Promise<BankAccount> { return this.accounts.close(user, account); }
}
