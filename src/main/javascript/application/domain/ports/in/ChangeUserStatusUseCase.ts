import { User } from '../../models/User';

/**
 * ChangeUserStatusUseCase - Input Port for changing a user status.
 */
export interface ChangeUserStatusUseCase {
  changeStatus(requestingUser: User, user: User): User;
}