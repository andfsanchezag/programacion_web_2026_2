import { SystemRole } from '../application/domain/valueobjects/SystemRole';
import { CustomerStatus } from '../application/domain/valueobjects/CustomerStatus';
import { UserStatus } from '../application/domain/valueobjects/UserStatus';
import { AccountStatus } from '../application/domain/valueobjects/AccountStatus';
import { AccountType } from '../application/domain/valueobjects/AccountType';
import { Currency } from '../application/domain/valueobjects/Currency';
import { BankAccount } from '../application/domain/models/BankAccount';
import { NaturalCustomer } from '../application/domain/models/NaturalCustomer';
import { Customer } from '../application/domain/models/Customer';
import { User } from '../application/domain/models/User';

export const NOW = new Date('2026-08-24T12:00:00Z');

let seq = 0;
export function nextId(): string {
  seq += 1;
  return `id-${seq}`;
}

export function makeNaturalCustomer(
  role: SystemRole = SystemRole.NATURAL_CUSTOMER,
  status: CustomerStatus = CustomerStatus.ACTIVE
): NaturalCustomer {
  return new NaturalCustomer(
    `cust-${nextId()}`,
    `ident-${seq}`,
    `Customer ${seq}`,
    `customer${seq}@bank.com`,
    '3001234567',
    'Address 1',
    role,
    status,
    NOW,
    `nat-${seq}`
  );
}

export function makeCustomer(): Customer {
  return makeNaturalCustomer();
}

export function makeUser(
  role: SystemRole = SystemRole.NATURAL_CUSTOMER,
  customer: Customer | null = null,
  status: UserStatus = UserStatus.ACTIVE
): User {
  return new User(
    `user-${nextId()}`,
    `ident-${seq}`,
    `User ${seq}`,
    `user${seq}@bank.com`,
    '3007654321',
    'Address U',
    role,
    `username${seq}`,
    'raw-password',
    status,
    customer
  );
}

export function makeBankAccount(
  owner: Customer,
  status: AccountStatus = AccountStatus.ACTIVE,
  balance: number = 0
): BankAccount {
  return new BankAccount(
    `acc-${nextId()}`,
    AccountType.SAVINGS,
    owner,
    Currency.COP,
    NOW,
    balance,
    status
  );
}
import { BusinessCustomer } from '../application/domain/models/BusinessCustomer';

export function makeBusinessCustomer(): BusinessCustomer {
  const representative = makeNaturalCustomer();
  return new BusinessCustomer(
    `biz-${nextId()}`,
    `tax-${seq}`,
    `Business ${seq}`,
    `business${seq}@bank.com`,
    '311',
    'Zona Industrial',
    SystemRole.BUSINESS_CUSTOMER,
    CustomerStatus.ACTIVE,
    NOW,
    `tax-${seq}`,
    representative
  );
}

export function makeAccountFor(owner: Customer): BankAccount {
  return makeBankAccount(owner, AccountStatus.ACTIVE, 0);
}

/** Builds a customer-like object carrying an invalid status value. */
export function makeCustomerWithInvalidStatus(): Customer {
  const fake = {
    customerId: 'fake-1',
    identification: 'fake-id',
    email: 'fake@x.com',
    status: {
      code: 'INVALID_CODE',
      isValid: () => false,
      equals: () => false,
      isOperational: () => false,
    },
    validateRegistration: () => undefined,
    isOperational: () => false,
    role: SystemRole.NATURAL_CUSTOMER,
  };
  return fake as unknown as Customer;
}
/** Builds a user-like object carrying an invalid status value. */
export function makeFakeInvalidStatusUser(): User {
  const fake = {
    userId: 'fake-user',
    username: 'fake',
    passwordHash: 'hash',
    role: SystemRole.INTERNAL_ANALYST,
    status: {
      code: 'INVALID_CODE',
      isValid: () => false,
      equals: () => false,
      canAuthenticate: () => true,
    },
    canAuthenticate: () => true,
    customer: null,
  };
  return fake as unknown as User;
}