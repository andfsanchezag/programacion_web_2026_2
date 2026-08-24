import { describe, it, expect, vi } from 'vitest';
import { UserAuthenticationService } from '../../../application/domain/services/UserAuthenticationService';
import {
  UserAlreadyExistsException,
  UserNotFoundException,
  InvalidCredentialsException,
  UnauthorizedUserOperationException,
  InvalidUserStatusException,
  InvalidUserException,
} from '../../../application/domain/exceptions/user-errors';
import { SystemRole } from '../../../application/domain/valueobjects/SystemRole';
import { UserStatus } from '../../../application/domain/valueobjects/UserStatus';
import { User } from '../../../application/domain/models/User';
import { makeCustomer, makeUser, makeFakeInvalidStatusUser } from '../../helpers';
import { userRepo, passwordService, jwtService } from '../services/mocks';

function build() {
  const users = userRepo();
  const passwords = passwordService();
  const tokens = jwtService();
  const service = new UserAuthenticationService(users, passwords, tokens);
  return { service, users, passwords, tokens };
}

describe('UserAuthenticationService', () => {
  it('registers a customer user with an encoded password', () => {
    const { service, users, passwords } = build();
    const user = makeUser(SystemRole.NATURAL_CUSTOMER, makeCustomer());
    const saved = service.registerCustomerUser(user);
    expect(saved).toBe(user);
    expect(users.save).toHaveBeenCalledWith(user);
    expect(passwords.encode).toHaveBeenCalledWith('raw-password');
  });

  it('rejects customer users without a customer relationship', () => {
    const { service } = build();
    expect(() => service.registerCustomerUser(makeUser())).toThrow(InvalidUserException);
  });

  it('prevents duplicated usernames on registration', () => {
    const { service, users } = build();
    (users.existsByUsername as ReturnType<typeof vi.fn>).mockReturnValue(true);
    expect(() => service.registerCustomerUser(makeUser(SystemRole.NATURAL_CUSTOMER, makeCustomer()))).toThrow(UserAlreadyExistsException);
  });

  it('registers employee users only when performed by an Internal Analyst', () => {
    const { service } = build();
    const analyst = makeUser(SystemRole.INTERNAL_ANALYST);
    const teller = makeUser(SystemRole.TELLER_EMPLOYEE);
    const employee = makeUser(SystemRole.COMMERCIAL_EMPLOYEE);
    expect(() => service.registerEmployeeUser(analyst, employee)).not.toThrow();
    expect(() => service.registerEmployeeUser(teller, employee)).toThrow(UnauthorizedUserOperationException);
  });

  it('authenticates an active user and issues a token', () => {
    const { service, users, tokens } = build();
    const stored = makeUser(SystemRole.NATURAL_CUSTOMER, null, UserStatus.ACTIVE);
    (users.findByUsername as ReturnType<typeof vi.fn>).mockReturnValue(stored);
    const result = service.login(User.forUsernameLookup(stored.username));
    expect(result.token).toBe('token-123');
    expect(result.username).toBe(stored.username);
    expect(tokens.generate).toHaveBeenCalledWith(stored);
  });

  it('rejects unknown or inactive users during login', () => {
    const { service, users } = build();
    (users.findByUsername as ReturnType<typeof vi.fn>).mockReturnValue(null);
    expect(() => service.login(User.forUsernameLookup('ghost'))).toThrow(UserNotFoundException);

    (users.findByUsername as ReturnType<typeof vi.fn>).mockReturnValue(
      new User('u-9','i-9','N','e@x.com','p','a', SystemRole.NATURAL_CUSTOMER,'blocked','h', UserStatus.BLOCKED)
    );
    expect(() => service.login(User.forUsernameLookup('blocked'))).toThrow(Error);
  });

  it('validates credentials against the stored hash', () => {
    const { service, users, passwords } = build();
    const stored = makeUser();
    (users.findByUsername as ReturnType<typeof vi.fn>).mockReturnValue(stored);
    (passwords.matches as ReturnType<typeof vi.fn>).mockReturnValue(false);
    expect(() => service.login(User.forUsernameLookup(stored.username))).toThrow(InvalidCredentialsException);
  });

  it('logs out existing users only', () => {
    const { service, users } = build();
    (users.findByUsername as ReturnType<typeof vi.fn>).mockReturnValue(makeUser());
    expect(() => service.logout(User.forUsernameLookup('user1'))).not.toThrow();
    (users.findByUsername as ReturnType<typeof vi.fn>).mockReturnValue(null);
    expect(() => service.logout(User.forUsernameLookup('ghost'))).toThrow(UserNotFoundException);
  });

  it('allows consulting own profile and blocks strangers unless analyst', () => {
    const { service, users } = build();
    const target = makeUser();
    (users.findById as ReturnType<typeof vi.fn>).mockReturnValue(target);
    expect(service.consult(target, target)).toBe(target);
    expect(() => service.consult(makeUser(SystemRole.NATURAL_CUSTOMER), target)).toThrow(UnauthorizedUserOperationException);
    expect(service.consult(makeUser(SystemRole.INTERNAL_ANALYST), target)).toBe(target);
    (users.findById as ReturnType<typeof vi.fn>).mockReturnValue(null);
    expect(() => service.consult(makeUser(SystemRole.INTERNAL_ANALYST), target)).toThrow(UserNotFoundException);
  });

  it('changes status only for Internal Analysts and validates statuses', () => {
    const { service, users } = build();
    (users.findById as ReturnType<typeof vi.fn>).mockReturnValue(makeUser());
    const target = makeUser();
    expect(service.changeStatus(makeUser(SystemRole.INTERNAL_ANALYST), target)).toBe(target);
    expect(() => service.changeStatus(makeUser(SystemRole.TELLER_EMPLOYEE), target)).toThrow(UnauthorizedUserOperationException);
    (users.findById as ReturnType<typeof vi.fn>).mockReturnValue(null);
    expect(() => service.changeStatus(makeUser(SystemRole.INTERNAL_ANALYST), target)).toThrow(UserNotFoundException);
    (users.findById as ReturnType<typeof vi.fn>).mockReturnValue(makeUser());
    expect(() => service.changeStatus(makeUser(SystemRole.INTERNAL_ANALYST), makeFakeInvalidStatusUser())).toThrow(InvalidUserStatusException);
  });
});