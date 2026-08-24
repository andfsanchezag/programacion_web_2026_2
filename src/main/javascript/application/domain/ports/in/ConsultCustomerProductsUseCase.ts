import { Customer } from '../../models/Customer';
import { BankingProduct } from '../../models/BankingProduct';
import { User } from '../../models/User';

/**
 * ConsultCustomerProductsUseCase - Input Port for consulting a customer products.
 */
export interface ConsultCustomerProductsUseCase {
  consultProducts(requestingUser: User, customer: Customer): BankingProduct[];
}