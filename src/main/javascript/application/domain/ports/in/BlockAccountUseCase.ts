import { BankAccount } from '../../models/BankAccount';
import { User } from '../../models/User';

/**
 * BlockAccountUseCase - Input Port for blocking a bank account.
 */
export interface BlockAccountUseCase {
  block(requestingUser: User, bankAccount: BankAccount): BankAccount;
}