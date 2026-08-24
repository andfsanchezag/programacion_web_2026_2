import { Operation } from '../../models/Operation';
import { BankingProduct } from '../../models/BankingProduct';
import { User } from '../../models/User';

/**
 * ConsultOperationsUseCase - Input Port for consulting operations of a product.
 */
export interface ConsultOperationsUseCase {
  consultOperations(requestingUser: User, product: BankingProduct): Operation[];
}