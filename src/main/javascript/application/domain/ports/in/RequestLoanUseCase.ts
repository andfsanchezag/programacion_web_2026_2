import { Loan } from '../../models/Loan';
import { User } from '../../models/User';

/**
 * RequestLoanUseCase - Input Port for requesting a loan.
 */
export interface RequestLoanUseCase {
  requestLoan(requestingUser: User, loan: Loan): Loan;
}