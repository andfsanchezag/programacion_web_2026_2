import { BusinessCustomer } from '../../models/BusinessCustomer';

/**
 * RegisterBusinessCustomerUseCase - Input Port for registering a business customer.
 */
export interface RegisterBusinessCustomerUseCase {
  registerBusinessCustomer(customer: BusinessCustomer): BusinessCustomer;
}