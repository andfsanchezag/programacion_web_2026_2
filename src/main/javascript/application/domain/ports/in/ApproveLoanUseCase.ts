import { Loan } from '../../models/Loan';
import { User } from '../../models/User';

/**
 * ApproveLoanUseCase - Input Port for approving a loan.
 */
export interface ApproveLoanUseCase {
  approveLoan(requestingUser: User, loan: Loan): Loan;
}