import { User } from '../../models/User';

/**
 * RegisterCustomerUserUseCase - Input Port for registering a user associated
 * with an existing Customer.
 */
export interface RegisterCustomerUserUseCase {
  registerCustomerUser(user: User): User;
}