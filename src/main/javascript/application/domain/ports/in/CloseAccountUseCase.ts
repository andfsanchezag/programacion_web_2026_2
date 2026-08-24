import { BankAccount } from '../../models/BankAccount';
import { User } from '../../models/User';

/**
 * CloseAccountUseCase - Input Port for closing a bank account.
 */
export interface CloseAccountUseCase {
  close(requestingUser: User, bankAccount: BankAccount): BankAccount;
}