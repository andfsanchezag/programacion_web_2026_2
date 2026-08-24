import { BankAccount } from '../../models/BankAccount';
import { User } from '../../models/User';

/**
 * DepositFundsUseCase - Input Port for depositing funds into a bank account.
 */
export interface DepositFundsUseCase {
  deposit(requestingUser: User, bankAccount: BankAccount, amount: number): BankAccount;
}