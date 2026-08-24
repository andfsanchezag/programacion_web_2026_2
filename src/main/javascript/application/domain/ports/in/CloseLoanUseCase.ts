import { Loan } from '../../models/Loan';
import { User } from '../../models/User';

/**
 * CloseLoanUseCase - Input Port for closing a loan.
 */
export interface CloseLoanUseCase {
  closeLoan(requestingUser: User, loan: Loan): Loan;
}