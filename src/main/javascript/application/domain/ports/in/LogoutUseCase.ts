import { User } from '../../models/User';

/**
 * LogoutUseCase - Input Port for terminating an authenticated session.
 */
export interface LogoutUseCase {
  logout(user: User): void;
}