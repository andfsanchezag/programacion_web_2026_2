import { describe, it, expect } from 'vitest';
import { User, InvalidUserException } from '../../../application/domain/models/User';
import { SystemRole } from '../../../application/domain/valueobjects/SystemRole';
import { UserStatus } from '../../../application/domain/valueobjects/UserStatus';
import { makeCustomer } from '../../helpers';

function make(overrides: Partial<Record<string, unknown>> = {}): User {
  return new User(
    (overrides.userId as string) ?? 'u-1',
    (overrides.identification as string) ?? 'id-1',
    (overrides.name as string) ?? 'User',
    (overrides.email as string) ?? 'u@x.com',
    (overrides.phone as string) ?? '31',
    (overrides.address as string) ?? 'Dir',
    (overrides.role as SystemRole) ?? SystemRole.NATURAL_CUSTOMER,
    (overrides.username as string) ?? 'user1',
    (overrides.passwordHash as string) ?? 'hash',
    (overrides.status as UserStatus) ?? UserStatus.ACTIVE,
    (overrides.customer as never) ?? null
  );
}

describe('User', () => {
  it('creates and exposes attributes and customer relationship', () => {
    const customer = makeCustomer();
    const u = make({ role: SystemRole.BUSINESS_OPERATOR, customer });
    expect(u.userId).toBe('u-1');
    expect(u.username).toBe('user1');
    expect(u.passwordHash).toBe('hash');
    expect(u.status).toBe(UserStatus.ACTIVE);
    expect(u.customer).toBe(customer);
    expect(u.role).toBe(SystemRole.BUSINESS_OPERATOR);
    expect(u.canAuthenticate()).toBe(true);
  });

  it('supports users without a customer relationship', () => {
    const u = make();
    expect(u.customer).toBeNull();
  });

  it('rejects invalid constructor arguments', () => {
    expect(() => make({ userId: '' })).toThrow(InvalidUserException);
    expect(() => make({ username: '' })).toThrow(InvalidUserException);
    expect(() => make({ passwordHash: '' })).toThrow(InvalidUserException);
  });

  it('replaces password with validation', () => {
    const u = make();
    u.replacePassword('new-hash');
    expect(u.passwordHash).toBe('new-hash');
    expect(() => u.replacePassword('')).toThrow(InvalidUserException);
  });

  it('changes status and authentication capability', () => {
    const u = make();
    u.changeStatus(UserStatus.BLOCKED);
    expect(u.status).toBe(UserStatus.BLOCKED);
    expect(u.canAuthenticate()).toBe(false);
  });

  it('creates lookup instances by username', () => {
    const lookup = User.forUsernameLookup('john');
    expect(lookup.username).toBe('john');
    expect(lookup.userId).toBe('lookup-john');
    expect(() => User.forUsernameLookup('')).toThrow();
  });
});