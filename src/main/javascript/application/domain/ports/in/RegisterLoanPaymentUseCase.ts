import { Loan } from '../../models/Loan';
import { User } from '../../models/User';

/**
 * RegisterLoanPaymentUseCase - Input Port for registering a loan payment.
 */
export interface RegisterLoanPaymentUseCase {
  registerLoanPayment(requestingUser: User, loan: Loan): Loan;
}