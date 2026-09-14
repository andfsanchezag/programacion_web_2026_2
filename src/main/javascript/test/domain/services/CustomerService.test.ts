import { describe, it, expect, vi } from 'vitest';
import { CustomerService } from '../../../application/domain/services/CustomerService';
import {
  CustomerAlreadyExistsException,
  CustomerNotFoundException,
  InvalidCustomerStatusException,
  UnauthorizedCustomerOperationException,
} from '../../../application/domain/exceptions/customer-errors';
import { SystemRole } from '../../../application/domain/valueobjects/SystemRole';
import { makeCustomer, makeNaturalCustomer, makeUser, makeBusinessCustomer, makeAccountFor, makeCustomerWithInvalidStatus } from '../../helpers';
import { customerRepo, accountRepo, loanRepo, authorization } from '../services/mocks';

function build() {
  const customers = customerRepo();
  const accounts = accountRepo();
  const loans = loanRepo();
  const authz = authorization();
  const service = new CustomerService(customers, accounts, loans, authz);
  return { service, customers, accounts, loans, authz };
}

describe('CustomerService', () => {
  it('registers a natural customer', async () => {
    const { service, customers } = build();
    const customer = makeNaturalCustomer();
    const saved = await service.registerNaturalCustomer(customer);
    expect(saved).toBe(customer);
    expect(customers.save).toHaveBeenCalledWith(customer);
  });

  it('registers a business customer', async () => {
    const { service, customers } = build();
    const customer = makeBusinessCustomer();
    const saved = await service.registerBusinessCustomer(customer);
    expect(saved).toBe(customer);
    expect(customers.save).toHaveBeenCalled();
  });

  it('prevents duplicate registration by identification or email', async () => {
    const { service, customers } = build();
    (customers.existsByIdentification as ReturnType<typeof vi.fn>).mockReturnValue(true);
    await expect(service.registerNaturalCustomer(makeNaturalCustomer())).rejects.toThrow(CustomerAlreadyExistsException);

    (customers.existsByIdentification as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (customers.existsByEmail as ReturnType<typeof vi.fn>).mockReturnValue(true);
    await expect(service.registerNaturalCustomer(makeNaturalCustomer())).rejects.toThrow(CustomerAlreadyExistsException);
  });

  it('rejects registration of a blocked customer', async () => {
    const { service } = build();
    const blocked = makeCustomer();
    blocked.block();
    await expect(service.registerNaturalCustomer(blocked as never)).rejects.toThrow(/blocked/i);
  });

  it('consults an existing customer', async () => {
    const { service, customers } = build();
    const customer = makeCustomer();
    (customers.findByIdentification as ReturnType<typeof vi.fn>).mockReturnValue(customer);
    const found = await service.consult(makeUser(SystemRole.TELLER_EMPLOYEE), customer);
    expect(found).toBe(customer);
  });

  it('throws when the consulted customer does not exist', async () => {
    const { service } = build();
    await expect(service.consult(makeUser(), makeCustomer())).rejects.toThrow(CustomerNotFoundException);
  });

  it('updates an existing customer', async () => {
    const { service, customers } = build();
    (customers.existsByIdentification as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const customer = makeCustomer();
    const updated = await service.update(makeUser(), customer);
    expect(updated).toBe(customer);
    expect(customers.update).toHaveBeenCalledWith(customer);
  });

  it('changes status of an existing customer', async () => {
    const { service, customers } = build();
    (customers.existsByIdentification as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const customer = makeCustomer();
    customer.block();
    const changed = await service.changeStatus(makeUser(SystemRole.INTERNAL_ANALYST), customer);
    expect(changed.status.isValid()).toBe(true);
    expect(customers.update).toHaveBeenCalled();
  });

  it('rejects invalid statuses on changeStatus', async () => {
    const { service, customers } = build();
    (customers.existsByIdentification as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const customer = makeCustomerWithInvalidStatus();
    await expect(service.changeStatus(makeUser(), customer)).rejects.toThrow(InvalidCustomerStatusException);
  });

  it('aggregates products owned by the customer', async () => {
    const { service, accounts, loans, customers } = build();
    const customer = makeCustomer();
    (customers.existsByIdentification as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (customers.existsByIdentification as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (accounts.findAllByOwner as ReturnType<typeof vi.fn>).mockReturnValue([makeAccountFor(customer)]);
    (loans.findAllByApplicant as ReturnType<typeof vi.fn>).mockReturnValue([]);
    const products = await service.consultProducts(makeUser(SystemRole.COMMERCIAL_EMPLOYEE), customer);
    expect(products.length).toBe(1);
    expect(products[0].identifier).toContain('acc-');
  });

  it('blocks unauthorized operations', async () => {
    const { service, authz } = build();
    (authz.canAccessCustomer as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(service.consult(makeUser(), makeCustomer())).rejects.toThrow(UnauthorizedCustomerOperationException);
    await expect(service.update(makeUser(), makeCustomer())).rejects.toThrow(UnauthorizedCustomerOperationException);
    await expect(service.changeStatus(makeUser(), makeCustomer())).rejects.toThrow(UnauthorizedCustomerOperationException);
    await expect(service.consultProducts(makeUser(), makeCustomer())).rejects.toThrow(UnauthorizedCustomerOperationException);
  });
});