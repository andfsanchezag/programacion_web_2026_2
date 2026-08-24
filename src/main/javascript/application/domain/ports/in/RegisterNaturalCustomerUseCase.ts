import { NaturalCustomer } from '../../models/NaturalCustomer';

/**
 * RegisterNaturalCustomerUseCase - Input Port for registering a natural customer.
 */
export interface RegisterNaturalCustomerUseCase {
  registerNaturalCustomer(customer: NaturalCustomer): NaturalCustomer;
}