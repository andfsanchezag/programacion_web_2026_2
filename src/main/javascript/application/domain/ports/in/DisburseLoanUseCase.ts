import { Loan } from '../../models/Loan';
import { User } from '../../models/User';

/**
 * DisburseLoanUseCase - Input Port for disbursing an approved loan.
 */
export interface DisburseLoanUseCase {
  disburseLoan(requestingUser: User, loan: Loan): Loan;
}