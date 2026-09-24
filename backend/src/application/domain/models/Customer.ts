import { Person } from './Person';
import { SystemRole } from '../valueobjects/SystemRole';
import { CustomerStatus } from '../valueobjects/CustomerStatus';
import {
  InvalidCustomerException,
  InvalidCustomerStatusException,
} from '../exceptions/customer-errors';

/**
 * Customer (Abstract) - Represents a person or organization that has a banking
 * relationship with the institution.
 *
 * This class cannot be instantiated directly.
 */
export abstract class Customer extends Person {
  private readonly _customerId: string;
  private _status: CustomerStatus;
  private readonly _registrationDate: Date;

  protected constructor(
    customerId: string,
    identification: string,
    name: string,
    email: string,
    phone: string,
    address: string,
    role: SystemRole,
    status: CustomerStatus,
    registrationDate: Date
  ) {
    super(identification, name, email, phone, address, role);
    this._customerId = customerId;
    this._status = status;
    this._registrationDate = registrationDate;
  }

  get customerId(): string {
    return this._customerId;
  }

  get status(): CustomerStatus {
    return this._status;
  }

  get registrationDate(): Date {
    return this._registrationDate;
  }

  activate(): void {
    this._status = CustomerStatus.ACTIVE;
  }

  deactivate(): void {
    this._status = CustomerStatus.INACTIVE;
  }

  block(): void {
    this._status = CustomerStatus.BLOCKED;
  }

  isOperational(): boolean {
    return this._status.isOperational();
  }

  /**
   * Validates that the customer can be registered in the domain.
   */
  validateRegistration(): void {
    if (!this.status.isValid()) {
      throw new InvalidCustomerStatusException(
        `Invalid customer status: ${this.status.code}`
      );
    }
    if (this.status.equals(CustomerStatus.BLOCKED)) {
      throw new InvalidCustomerException('A blocked customer cannot be registered');
    }
  }
}