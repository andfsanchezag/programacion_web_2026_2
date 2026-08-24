import { BankAccount } from '../../models/BankAccount';
import { User } from '../../models/User';

/**
 * ConsultBalanceUseCase - Input Port for consulting a bank account balance.
 */
export interface ConsultBalanceUseCase {
  consultBalance(requestingUser: User, bankAccount: BankAccount): number;
}