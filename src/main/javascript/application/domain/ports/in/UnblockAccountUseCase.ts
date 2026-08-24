import { BankAccount } from '../../models/BankAccount';
import { User } from '../../models/User';

/**
 * UnblockAccountUseCase - Input Port for unblocking a bank account.
 */
export interface UnblockAccountUseCase {
  unblock(requestingUser: User, bankAccount: BankAccount): BankAccount;
}