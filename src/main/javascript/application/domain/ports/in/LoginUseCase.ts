import { User } from '../../models/User';
import { SystemRole } from '../../valueobjects/SystemRole';

/**
 * LoginUseCase - Input Port for authenticating a user.
 */
export interface LoginUseCase {
  login(user: User): User;
}

/**
 * AuthenticationResult - Result of a successful authentication.
 */
export interface AuthenticationResult {
  readonly token: string;
  readonly username: string;
  readonly role: SystemRole;
}

/**
 * LoginSessionUseCase - Input Port for authenticating a user and obtaining a session token.
 */
export interface LoginSessionUseCase {
  login(user: User): AuthenticationResult;
}