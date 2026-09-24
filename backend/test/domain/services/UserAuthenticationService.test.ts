import { describe, it, expect, vi } from 'vitest';
import { UserAuthenticationService } from '../../../src/application/domain/services/UserAuthenticationService';
import {
  UserAlreadyExistsException,
  UserNotFoundException,
  InvalidCredentialsException,
  UnauthorizedUserOperationException,
  InvalidUserStatusException,
  InvalidUserException,
} from '../../../src/application/domain/exceptions/user-errors';
import { SystemRole } from '../../../src/application/domain/valueobjects/SystemRole';
import { UserStatus } from '../../../src/application/domain/valueobjects/UserStatus';
import { User } from '../../../src/application/domain/models/User';
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
  it('registers a customer user with an encoded password', async () => {
    const { service, users, passwords } = build();
    const user = makeUser(SystemRole.NATURAL_CUSTOMER, makeCustomer());
    const saved = await service.registerCustomerUser(user);
    expect(saved).toBe(user);
    expect(users.save).toHaveBeenCalledWith(user);
    expect(passwords.encode).toHaveBeenCalledWith('raw-password');
  });

  it('rejects customer users without a customer relationship', async () => {
    const { service } = build();
    await expect(service.registerCustomerUser(makeUser())).rejects.toThrow(InvalidUserException);
  });

  it('prevents duplicated usernames on registration', async () => {
    const { service, users } = build();
    (users.existsByUsername as ReturnType<typeof vi.fn>).mockReturnValue(true);
    await expect(service.registerCustomerUser(makeUser(SystemRole.NATURAL_CUSTOMER, makeCustomer()))).rejects.toThrow(UserAlreadyExistsException);
  });

  it('registers employee users only when performed by an Internal Analyst', async () => {
    const { service } = build();
    const analyst = makeUser(SystemRole.INTERNAL_ANALYST);
    const teller = makeUser(SystemRole.TELLER_EMPLOYEE);
    const employee = makeUser(SystemRole.COMMERCIAL_EMPLOYEE);
    await service.registerEmployeeUser(analyst, employee);
    await expect(service.registerEmployeeUser(teller, employee)).rejects.toThrow(UnauthorizedUserOperationException);
  });

  it('authenticates an active user and issues a token', async () => {
    const { service, users, tokens } = build();
    const stored = makeUser(SystemRole.NATURAL_CUSTOMER, null, UserStatus.ACTIVE);
    (users.findByUsername as ReturnType<typeof vi.fn>).mockReturnValue(stored);
    const result = await service.login(User.forUsernameLookup(stored.username));
    expect(result.token).toBe('token-123');
    expect(result.username).toBe(stored.username);
    expect(tokens.generate).toHaveBeenCalledWith(stored);
  });

  it('rejects unknown or inactive users during login', async () => {
    const { service, users } = build();
    (users.findByUsername as ReturnType<typeof vi.fn>).mockReturnValue(null);
    await expect(service.login(User.forUsernameLookup('ghost'))).rejects.toThrow(UserNotFoundException);

    (users.findByUsername as ReturnType<typeof vi.fn>).mockReturnValue(
      new User('u-9','i-9','N','e@x.com','p','a', SystemRole.NATURAL_CUSTOMER,'blocked','h', UserStatus.BLOCKED)
    );
    await expect(service.login(User.forUsernameLookup('blocked'))).rejects.toThrow(Error);
  });

  it('validates credentials against the stored hash', async () => {
    const { service, users, passwords } = build();
    const stored = makeUser();
    (users.findByUsername as ReturnType<typeof vi.fn>).mockReturnValue(stored);
    (passwords.matches as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(service.login(User.forUsernameLookup(stored.username))).rejects.toThrow(InvalidCredentialsException);
  });

  it('logs out existing users only', async () => {
    const { service, users } = build();
    (users.findByUsername as ReturnType<typeof vi.fn>).mockReturnValue(makeUser());
    await service.logout(User.forUsernameLookup('user1'));
    (users.findByUsername as ReturnType<typeof vi.fn>).mockReturnValue(null);
    await expect(service.logout(User.forUsernameLookup('ghost'))).rejects.toThrow(UserNotFoundException);
  });

  it('allows consulting own profile and blocks strangers unless analyst', async () => {
    const { service, users } = build();
    const target = makeUser();
    (users.findById as ReturnType<typeof vi.fn>).mockReturnValue(target);
    expect(await service.consult(target, target)).toBe(target);
    await expect(service.consult(makeUser(SystemRole.NATURAL_CUSTOMER), target)).rejects.toThrow(UnauthorizedUserOperationException);
    expect(await service.consult(makeUser(SystemRole.INTERNAL_ANALYST), target)).toBe(target);
    (users.findById as ReturnType<typeof vi.fn>).mockReturnValue(null);
    await expect(service.consult(makeUser(SystemRole.INTERNAL_ANALYST), target)).rejects.toThrow(UserNotFoundException);
  });

  it('changes status only for Internal Analysts and validates statuses', async () => {
    const { service, users } = build();
    (users.findById as ReturnType<typeof vi.fn>).mockReturnValue(makeUser());
    const target = makeUser();
    expect(await service.changeStatus(makeUser(SystemRole.INTERNAL_ANALYST), target)).toBe(target);
    await expect(service.changeStatus(makeUser(SystemRole.TELLER_EMPLOYEE), target)).rejects.toThrow(UnauthorizedUserOperationException);
    (users.findById as ReturnType<typeof vi.fn>).mockReturnValue(null);
    await expect(service.changeStatus(makeUser(SystemRole.INTERNAL_ANALYST), target)).rejects.toThrow(UserNotFoundException);
    (users.findById as ReturnType<typeof vi.fn>).mockReturnValue(makeUser());
    await expect(service.changeStatus(makeUser(SystemRole.INTERNAL_ANALYST), makeFakeInvalidStatusUser())).rejects.toThrow(InvalidUserStatusException);
  });
});