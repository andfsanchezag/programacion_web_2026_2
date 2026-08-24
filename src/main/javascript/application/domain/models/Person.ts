import { SystemRole } from '../valueobjects/SystemRole';

/**
 * Person (Abstract) - Represents any identifiable person within the banking system.
 *
 * Centralizes the common identity and contact information shared by customers
 * and system users. The role assigned to a person represents what that person
 * means within the system and determines the responsibilities associated with it.
 *
 * This class cannot be instantiated directly.
 */
export abstract class Person {
  private readonly _identification: string;
  private readonly _name: string;
  private _email: string;
  private _phone: string;
  private _address: string;
  private readonly _role: SystemRole;

  protected constructor(
    identification: string,
    name: string,
    email: string,
    phone: string,
    address: string,
    role: SystemRole
  ) {
    this.assertNotEmpty(identification, 'identification');
    this.assertNotEmpty(name, 'name');
    this._identification = identification;
    this._name = name;
    this._email = email;
    this._phone = phone;
    this._address = address;
    this._role = role;
  }

  get identification(): string {
    return this._identification;
  }

  get name(): string {
    return this._name;
  }

  get email(): string {
    return this._email;
  }

  get phone(): string {
    return this._phone;
  }

  get address(): string {
    return this._address;
  }

  get role(): SystemRole {
    return this._role;
  }

  updateContactInformation(email: string, phone: string, address: string): void {
    if (email === null || email === undefined || email.trim().length === 0) {
      throw new InvalidPersonException('Person email must not be empty');
    }
    this._email = email;
    this._phone = phone;
    this._address = address;
  }

  private assertNotEmpty(value: string, field: string): void {
    if (value === null || value === undefined || value.trim().length === 0) {
      throw new InvalidPersonException(`Person ${field} must not be empty`);
    }
  }
}

export class InvalidPersonException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPersonException';
  }
}