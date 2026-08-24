import { Loan } from '../../models/Loan';
import { User } from '../../models/User';

/**
 * RejectLoanUseCase - Input Port for rejecting a loan.
 */
export interface RejectLoanUseCase {
  rejectLoan(requestingUser: User, loan: Loan): Loan;
}