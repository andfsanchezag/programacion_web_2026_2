import { Customer } from '../../models/Customer';
import { User } from '../../models/User';

/**
 * UpdateCustomerUseCase - Input Port for updating an existing customer.
 */
export interface UpdateCustomerUseCase {
  update(requestingUser: User, customer: Customer): Customer;
}