import { User } from '../../models/User';
import { Customer } from '../../models/Customer';
import { BankAccount } from '../../models/BankAccount';

/** TELLER_EMPLOYEE: operaciones de ventanilla. */
export interface TellerEmployeePort {
  consultCustomer(user: User, customer: Customer): Promise<Customer>;
  openBankAccount(user: User, account: BankAccount): Promise<BankAccount>;
  consultBankAccount(user: User, account: BankAccount): Promise<BankAccount>;
  consultAccountBalance(user: User, account: BankAccount): Promise<number>;
  depositFunds(user: User, account: BankAccount, amount: number): Promise<BankAccount>;
  withdrawFunds(user: User, account: BankAccount, amount: number): Promise<BankAccount>;
  blockBankAccount(user: User, account: BankAccount): Promise<BankAccount>;
  unblockBankAccount(user: User, account: BankAccount): Promise<BankAccount>;
  closeBankAccount(user: User, account: BankAccount): Promise<BankAccount>;
}
