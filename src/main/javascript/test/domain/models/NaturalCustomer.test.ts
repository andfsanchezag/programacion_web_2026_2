import { describe, it, expect } from 'vitest';
import { NaturalCustomer } from '../../../application/domain/models/NaturalCustomer';
import { InvalidNaturalCustomerException } from '../../../application/domain/models/NaturalCustomer';
import { SystemRole } from '../../../application/domain/valueobjects/SystemRole';
import { CustomerStatus } from '../../../application/domain/valueobjects/CustomerStatus';
import { NOW } from '../../helpers';

describe('NaturalCustomer', () => {
  function make(identification = '123', name = 'Ana', natId = 'CC-1') {
    return new NaturalCustomer(
      'c-1', identification, name, 'ana@x.com', '3111', 'Calle 1',
      SystemRole.NATURAL_CUSTOMER, CustomerStatus.ACTIVE, NOW, natId
    );
  }

  it('creates and exposes inherited attributes', () => {
    const c = make();
    expect(c.customerId).toBe('c-1');
    expect(c.identification).toBe('123');
    expect(c.name).toBe('Ana');
    expect(c.email).toBe('ana@x.com');
    expect(c.phone).toBe('3111');
    expect(c.address).toBe('Calle 1');
    expect(c.role).toBe(SystemRole.NATURAL_CUSTOMER);
    expect(c.status).toBe(CustomerStatus.ACTIVE);
    expect(c.registrationDate).toBe(NOW);
    expect(c.nationalIdentificationNumber).toBe('CC-1');
  });

  it('rejects empty national identification number', () => {
    expect(() => make('1','A','')).toThrow(InvalidNaturalCustomerException);
    expect(() => make('1','A',null as unknown as string)).toThrow(InvalidNaturalCustomerException);
  });

  it('updates contact information', () => {
    const c = make();
    c.updateContactInformation('new@x.com', '3222', 'Nueva');
    expect(c.email).toBe('new@x.com');
    expect(c.phone).toBe('3222');
    expect(c.address).toBe('Nueva');
  });

  it('rejects empty email on contact update', () => {
    const c = make();
    expect(() => c.updateContactInformation('', '3', 'a')).toThrow(Error);
  });

  it('manages status lifecycle', () => {
    const c = make();
    c.block();
    expect(c.status).toBe(CustomerStatus.BLOCKED);
    expect(c.isOperational()).toBe(false);
    c.activate();
    expect(c.isOperational()).toBe(true);
    c.deactivate();
    expect(c.isOperational()).toBe(false);
  });

  it('validates registration rules', () => {
    const ok = new NaturalCustomer('c2','9','B','b@x.com','p','a', SystemRole.NATURAL_CUSTOMER, CustomerStatus.ACTIVE, NOW, 'n2');
    expect(() => ok.validateRegistration()).not.toThrow();

    const blocked = new NaturalCustomer('c3','8','C','c@x.com','p','a', SystemRole.NATURAL_CUSTOMER, CustomerStatus.BLOCKED, NOW, 'n3');
    expect(() => blocked.validateRegistration()).toThrow(/blocked customer cannot be registered/i);
  });
});