import { describe, it, expect } from 'vitest';
import { BusinessCustomer, InvalidBusinessCustomerException } from '../../../application/domain/models/BusinessCustomer';
import { NaturalCustomer } from '../../../application/domain/models/NaturalCustomer';
import { SystemRole } from '../../../application/domain/valueobjects/SystemRole';
import { CustomerStatus } from '../../../application/domain/valueobjects/CustomerStatus';
import { NOW } from '../../helpers';

describe('BusinessCustomer', () => {
  const rep = new NaturalCustomer(
    'rep-1', 'rep-id', 'Rep', 'rep@x.com', '31', 'Dir',
    SystemRole.NATURAL_CUSTOMER, CustomerStatus.ACTIVE, NOW, 'cc-rep'
  );

  function make(taxId: string = '9001', representative: NaturalCustomer = rep) {
    return new BusinessCustomer(
      'biz-1', taxId, 'Acme SA', 'acme@x.com', '32', 'Zona Industrial',
      SystemRole.BUSINESS_CUSTOMER, CustomerStatus.ACTIVE, NOW, taxId, representative
    );
  }

  it('creates with legal representative relationship', () => {
    const b = make();
    expect(b.taxIdentificationNumber).toBe('9001');
    expect(b.legalRepresentative).toBe(rep);
    expect(b.customerId).toBe('biz-1');
    expect(b.role).toBe(SystemRole.BUSINESS_CUSTOMER);
  });

  it('rejects empty tax id and missing representative', () => {
    expect(() => make('')).toThrow(InvalidBusinessCustomerException);
    expect(() => make('9001', null as unknown as NaturalCustomer)).toThrow(InvalidBusinessCustomerException);
  });
});