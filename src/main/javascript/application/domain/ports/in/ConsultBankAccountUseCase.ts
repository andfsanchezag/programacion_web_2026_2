import { BankAccount } from '../../models/BankAccount';
import { User } from '../../models/User';

/**
 * ConsultBankAccountUseCase - Input Port for consulting a bank account.
 */
export interface ConsultBankAccountUseCase {
  consult(requestingUser: User, bankAccount: BankAccount): BankAccount;
}