import { BankAccount } from '../../models/BankAccount';
import { User } from '../../models/User';

/**
 * WithdrawFundsUseCase - Input Port for withdrawing funds from a bank account.
 */
export interface WithdrawFundsUseCase {
  withdraw(requestingUser: User, bankAccount: BankAccount, amount: number): BankAccount;
}