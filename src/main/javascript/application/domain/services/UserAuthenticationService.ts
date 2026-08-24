import { User } from '../models/User';
import { SystemRole } from '../valueobjects/SystemRole';
import { UserRepositoryPort } from '../ports/out/UserRepositoryPort';
import { PasswordServicePort } from '../ports/out/PasswordServicePort';
import { JwtTokenServicePort } from '../ports/out/JwtTokenServicePort';
import { RegisterCustomerUserUseCase } from '../ports/in/RegisterCustomerUserUseCase';
import { RegisterEmployeeUserUseCase } from '../ports/in/RegisterEmployeeUserUseCase';
import { LoginSessionUseCase, AuthenticationResult } from '../ports/in/LoginUseCase';
import { LogoutUseCase } from '../ports/in/LogoutUseCase';
import { ConsultUserUseCase } from '../ports/in/ConsultUserUseCase';
import { ChangeUserStatusUseCase } from '../ports/in/ChangeUserStatusUseCase';
import {
  UserAlreadyExistsException,
  UserNotFoundException,
  InvalidCredentialsException,
  UserNotActiveException,
  UnauthorizedUserOperationException,
  InvalidUserStatusException,
  InvalidUserException,
} from '../exceptions/user-errors';

/**
 * UserAuthenticationService - Coordinates user registration and authentication
 * while preserving domain integrity.
 */
export class UserAuthenticationService implements
  RegisterCustomerUserUseCase,
  RegisterEmployeeUserUseCase,
  LoginSessionUseCase,
  LogoutUseCase,
  ConsultUserUseCase,
  ChangeUserStatusUseCase {

  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordService: PasswordServicePort,
    private readonly jwtTokenService: JwtTokenServicePort
  ) {}

  registerCustomerUser(user: User): User {
    if (user.customer === null || user.customer === undefined) {
      throw new InvalidUserException(
        'A customer user must be associated with an existing customer'
      );
    }
    if (this.userRepository.existsByUsername(user)) {
      throw new UserAlreadyExistsException('Username is already in use');
    }
    user.replacePassword(this.passwordService.encode(user.passwordHash));
    return this.userRepository.save(user);
  }

  registerEmployeeUser(registeredBy: User, user: User): User {
    if (!registeredBy.role.equals(SystemRole.INTERNAL_ANALYST)) {
      throw new UnauthorizedUserOperationException(
        'Only an Internal Analyst can register employee users'
      );
    }
    if (this.userRepository.existsByUsername(user)) {
      throw new UserAlreadyExistsException('Username is already in use');
    }
    user.replacePassword(this.passwordService.encode(user.passwordHash));
    return this.userRepository.save(user);
  }

  login(user: User): AuthenticationResult {
    const stored = this.findByUsername(user.username);
    if (!stored.canAuthenticate()) {
      throw new UserNotActiveException('User is not active');
    }
    if (!this.passwordService.matches(user.passwordHash, stored.passwordHash)) {
      throw new InvalidCredentialsException('Invalid username or password');
    }
    const token = this.jwtTokenService.generate(stored);
    return {
      token: token,
      username: stored.username,
      role: stored.role,
    };
  }

  logout(user: User): void {
    this.findByUsername(user.username);
  }

  consult(requestingUser: User, user: User): User {
    this.assertCanConsult(requestingUser, user);
    const found = this.userRepository.findById(user);
    if (found === null || found === undefined) {
      throw new UserNotFoundException('User not found');
    }
    return found;
  }

  changeStatus(requestingUser: User, user: User): User {
    if (!requestingUser.role.equals(SystemRole.INTERNAL_ANALYST)) {
      throw new UnauthorizedUserOperationException(
        'User is not authorized to change user status'
      );
    }
    this.ensureExists(user);
    if (!user.status.isValid()) {
      throw new InvalidUserStatusException('Invalid user status');
    }
    this.userRepository.update(user);
    return user;
  }

  private findByUsername(username: string): User {
    const stored = this.userRepository.findByUsername(User.forUsernameLookup(username));
    if (stored === null || stored === undefined) {
      throw new UserNotFoundException('User not found');
    }
    return stored;
  }

  private ensureExists(user: User): void {
    const found = this.userRepository.findById(user);
    if (found === null || found === undefined) {
      throw new UserNotFoundException('User not found');
    }
  }

  private assertCanConsult(actor: User, target: User): void {
    if (actor.userId !== target.userId && !actor.role.equals(SystemRole.INTERNAL_ANALYST)) {
      throw new UnauthorizedUserOperationException(
        'User is not authorized to consult this user'
      );
    }
  }
}