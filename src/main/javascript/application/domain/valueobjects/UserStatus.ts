import { DomainCatalog } from './DomainCatalog';

/**
 * UserStatus - Represents system access status of a user.
 * Independent from CustomerStatus.
 */
export class UserStatus extends DomainCatalog {
  private static readonly VALUES: Map<string, UserStatus> = new Map();

  static readonly ACTIVE = UserStatus.create('ACTIVE', 'Active', 'User has active system access');
  static readonly INACTIVE = UserStatus.create('INACTIVE', 'Inactive', 'User system access is inactive');
  static readonly BLOCKED = UserStatus.create('BLOCKED', 'Blocked', 'User system access is blocked');
  static readonly PENDING = UserStatus.create('PENDING', 'Pending', 'User access is pending activation');

  private constructor(code: string, name: string, description: string) {
    super(code, name, description);
  }

  private static create(code: string, name: string, description: string): UserStatus {
    const status = new UserStatus(code, name, description);
    UserStatus.VALUES.set(code, status);
    return status;
  }

  static fromCode(code: string): UserStatus {
    const status = UserStatus.VALUES.get(code);
    if (!status) {
      throw new InvalidUserStatusException(`Invalid user status code: ${code}`);
    }
    return status;
  }

  static getAll(): UserStatus[] {
    return Array.from(UserStatus.VALUES.values());
  }

  isValid(): boolean {
    return UserStatus.VALUES.has(this.code);
  }

  canAuthenticate(): boolean {
    return this.equals(UserStatus.ACTIVE);
  }
}

export class InvalidUserStatusException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUserStatusException';
  }
}