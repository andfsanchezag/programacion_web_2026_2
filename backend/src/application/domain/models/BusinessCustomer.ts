import { Customer } from './Customer';
import { NaturalCustomer } from './NaturalCustomer';
import { SystemRole } from '../valueobjects/SystemRole';
import { CustomerStatus } from '../valueobjects/CustomerStatus';

/**
 * BusinessCustomer - A banking customer representing a legal business entity.
 * The legal representative is represented by the NaturalCustomer Domain Model.
 */
export class BusinessCustomer extends Customer {
  private readonly _taxIdentificationNumber: string;
  private readonly _legalRepresentative: NaturalCustomer;

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
    taxIdentificationNumber: string,
    legalRepresentative: NaturalCustomer
  ) {
    if (taxIdentificationNumber === null || taxIdentificationNumber === undefined || taxIdentificationNumber.trim().length === 0) {
      throw new InvalidBusinessCustomerException('Business customer tax identification number must not be empty');
    }
    if (legalRepresentative === null || legalRepresentative === undefined) {
      throw new InvalidBusinessCustomerException('Business customer legal representative must be provided');
    }
    super(customerId, identification, name, email, phone, address, role, status, registrationDate);
    this._taxIdentificationNumber = taxIdentificationNumber;
    this._legalRepresentative = legalRepresentative;
  }

  get taxIdentificationNumber(): string {
    return this._taxIdentificationNumber;
  }

  get legalRepresentative(): NaturalCustomer {
    return this._legalRepresentative;
  }
}

export class InvalidBusinessCustomerException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBusinessCustomerException';
  }
}