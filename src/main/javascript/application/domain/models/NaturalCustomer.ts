import { Customer } from './Customer';
import { SystemRole } from '../valueobjects/SystemRole';
import { CustomerStatus } from '../valueobjects/CustomerStatus';

/**
 * NaturalCustomer - A banking customer representing a natural person.
 */
export class NaturalCustomer extends Customer {
  private readonly _nationalIdentificationNumber: string;

  constructor(
    customerId: string,
    identification: string,
    name: string,
    email: string,
    phone: string,
    address: string,
    role: SystemRole,
    status: CustomerStatus,
    registrationDate: Date,
    nationalIdentificationNumber: string
  ) {
    if (nationalIdentificationNumber === null || nationalIdentificationNumber === undefined || nationalIdentificationNumber.trim().length === 0) {
      throw new InvalidNaturalCustomerException('Natural customer national identification number must not be empty');
    }
    super(customerId, identification, name, email, phone, address, role, status, registrationDate);
    this._nationalIdentificationNumber = nationalIdentificationNumber;
  }

  get nationalIdentificationNumber(): string {
    return this._nationalIdentificationNumber;
  }
}

export class InvalidNaturalCustomerException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidNaturalCustomerException';
  }
}