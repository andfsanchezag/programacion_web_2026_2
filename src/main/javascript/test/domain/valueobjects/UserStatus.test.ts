import { describe, it, expect } from 'vitest';
import { UserStatus, InvalidUserStatusException } from '../../../application/domain/valueobjects/UserStatus';

describe('UserStatus', () => {
  it('exposes statuses and helpers', () => {
    expect(UserStatus.getAll().length).toBe(4);
    expect(UserStatus.fromCode('PENDING')).toBe(UserStatus.PENDING);
    expect(UserStatus.ACTIVE.isValid()).toBe(true);
  });

  it('throws on invalid code', () => {
    expect(() => UserStatus.fromCode('X')).toThrow(InvalidUserStatusException);
  });

  it('checks authentication availability', () => {
    expect(UserStatus.ACTIVE.canAuthenticate()).toBe(true);
    expect(UserStatus.BLOCKED.canAuthenticate()).toBe(false);
    expect(UserStatus.INACTIVE.canAuthenticate()).toBe(false);
  });
});