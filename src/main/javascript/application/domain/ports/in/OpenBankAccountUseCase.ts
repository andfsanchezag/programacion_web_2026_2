import { BankAccount } from '../../models/BankAccount';
import { User } from '../../models/User';

/**
 * OpenBankAccountUseCase - Input Port for opening a bank account.
 */
export interface OpenBankAccountUseCase {
  openAccount(requestingUser: User, bankAccount: BankAccount): BankAccount;
}