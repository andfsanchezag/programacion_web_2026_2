import { User } from '../../models/User';

/**
 * ConsultUserUseCase - Input Port for consulting a user.
 */
export interface ConsultUserUseCase {
  consult(requestingUser: User, user: User): User;
}