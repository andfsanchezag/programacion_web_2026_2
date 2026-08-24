import { Customer } from '../../models/Customer';
import { User } from '../../models/User';

/**
 * ConsultCustomerUseCase - Input Port for consulting a customer.
 */
export interface ConsultCustomerUseCase {
  consult(requestingUser: User, customer: Customer): Customer;
}