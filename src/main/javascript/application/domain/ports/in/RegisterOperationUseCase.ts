import { Operation } from '../../models/Operation';

/**
 * RegisterOperationUseCase - Input Port for registering a business operation.
 */
export interface RegisterOperationUseCase {
  registerOperation(operation: Operation): Operation;
}