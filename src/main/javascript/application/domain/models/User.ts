import { Person } from './Person';
import { Customer } from './Customer';
import { SystemRole } from '../valueobjects/SystemRole';
import { UserStatus } from '../valueobjects/UserStatus';

/**
 * User - Represents a system identity used for authentication and authorization.
 * Inherits from Person. A user may be associated with an optional Customer.
 */
export class User extends Person {
  private readonly _userId: string;
  private readonly _username: string;
  private _passwordHash: string;
  private _status: UserStatus;
  private readonly _customer: Customer | null;

  constructor(
    userId: string,
    identification: string,
    name: string,
    email: string,
    phone: string,
    address: string,
    role: SystemRole,
    username: string,
    passwordHash: string,
    status: UserStatus,
    customer: Customer | null = null
  ) {
    super(identification, name, email, phone, address, role);
    if (userId === null || userId === undefined || userId.trim().length === 0) {
      throw new InvalidUserException('User id must not be empty');
    }
    if (username === null || username === undefined || username.trim().length === 0) {
      throw new InvalidUserException('User username must not be empty');
    }
    if (passwordHash === null || passwordHash === undefined || passwordHash.trim().length === 0) {
      throw new InvalidUserException('User password hash must not be empty');
    }
    this._userId = userId;
    this._username = username;
    this._passwordHash = passwordHash;
    this._status = status;
    this._customer = customer;
  }

  /**
   * Creates a lightweight User representing a lookup by username.
   * Used to honor the Domain Model parameter rule for repository lookups.
   */
  static forUsernameLookup(username: string): User {
    return new User(
      `lookup-${username}`,
      username,
      username,
      '',
      '',
      '',
      SystemRole.NATURAL_CUSTOMER,
      username,
      'lookup',
      UserStatus.ACTIVE
    );
  }

  get userId(): string {
    return this._userId;
  }

  get username(): string {
    return this._username;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  get status(): UserStatus {
    return this._status;
  }

  get customer(): Customer | null {
    return this._customer;
  }

  replacePassword(passwordHash: string): void {
    if (passwordHash === null || passwordHash === undefined || passwordHash.trim().length === 0) {
      throw new InvalidUserException('User password hash must not be empty');
    }
    this._passwordHash = passwordHash;
  }

  changeStatus(status: UserStatus): void {
    this._status = status;
  }

  canAuthenticate(): boolean {
    return this._status.canAuthenticate();
  }
}

export class InvalidUserException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUserException';
  }
}