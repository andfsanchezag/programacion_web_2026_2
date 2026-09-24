import { User } from '../models/User';
import { SystemRole } from '../valueobjects/SystemRole';
import { UserRepositoryPort } from '../ports/out/UserRepositoryPort';
import { PasswordServicePort } from '../ports/out/PasswordServicePort';
import { JwtTokenServicePort } from '../ports/out/JwtTokenServicePort';
import { AuthenticationResult } from '../ports/in/PublicAccessPort';
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
export class UserAuthenticationService {

  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordService: PasswordServicePort,
    private readonly jwtTokenService: JwtTokenServicePort
  ) {}

  async registerCustomerUser(user: User): Promise<User> {
    if (user.customer === null || user.customer === undefined) {
      throw new InvalidUserException(
        'A customer user must be associated with an existing customer'
      );
    }
    if (await this.userRepository.existsByUsername(user)) {
      throw new UserAlreadyExistsException('Username is already in use');
    }
    user.replacePassword(this.passwordService.encode(user.passwordHash));
    return this.userRepository.save(user);
  }

  async registerEmployeeUser(registeredBy: User, user: User): Promise<User> {
    if (!registeredBy.role.equals(SystemRole.INTERNAL_ANALYST)) {
      throw new UnauthorizedUserOperationException(
        'Only an Internal Analyst can register employee users'
      );
    }
    if (await this.userRepository.existsByUsername(user)) {
      throw new UserAlreadyExistsException('Username is already in use');
    }
    user.replacePassword(this.passwordService.encode(user.passwordHash));
    return this.userRepository.save(user);
  }

  async login(user: User): Promise<AuthenticationResult> {
    // Contrato Rest-validation §3.1: usuario desconocido y contraseña errónea
    // responden igual (401 INVALID_CREDENTIALS) para no enumerar usuarios.
    let stored: User;
    try {
      stored = await this.findByUsername(user.username);
    } catch (e) {
      if (e instanceof UserNotFoundException) {
        throw new InvalidCredentialsException('Invalid username or password');
      }
      throw e;
    }
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

  async logout(user: User): Promise<void> {
    await this.findByUsername(user.username);
  }

  async consult(requestingUser: User, user: User): Promise<User> {
    this.assertCanConsult(requestingUser, user);
    const found = await this.userRepository.findById(user);
    if (found === null || found === undefined) {
      throw new UserNotFoundException('User not found');
    }
    return found;
  }

  async changeStatus(requestingUser: User, user: User): Promise<User> {
    if (!requestingUser.role.equals(SystemRole.INTERNAL_ANALYST)) {
      throw new UnauthorizedUserOperationException(
        'User is not authorized to change user status'
      );
    }
    await this.ensureExists(user);
    if (!user.status.isValid()) {
      throw new InvalidUserStatusException('Invalid user status');
    }
    await this.userRepository.update(user);
    return user;
  }

  private async findByUsername(username: string): Promise<User> {
    const stored = await this.userRepository.findByUsername(User.forUsernameLookup(username));
    if (stored === null || stored === undefined) {
      throw new UserNotFoundException('User not found');
    }
    return stored;
  }

  private async ensureExists(user: User): Promise<void> {
    const found = await this.userRepository.findById(user);
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
