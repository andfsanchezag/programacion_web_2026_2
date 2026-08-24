import { User } from '../../models/User';
import { SystemRole } from '../../valueobjects/SystemRole';

/**
 * RegisterEmployeeUserUseCase - Input Port for registering an employee user.
 * Restricted to the INTERNAL_ANALYST role according to business rules.
 */
export interface RegisterEmployeeUserUseCase {
  registerEmployeeUser(registeredBy: User, user: User): User;
}