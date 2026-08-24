import { Customer } from '../../models/Customer';
import { User } from '../../models/User';

/**
 * ChangeCustomerStatusUseCase - Input Port for changing a customer status.
 */
export interface ChangeCustomerStatusUseCase {
  changeStatus(requestingUser: User, customer: Customer): Customer;
}