import { Transfer } from '../../models/Transfer';
import { User } from '../../models/User';

/**
 * CreateTransferUseCase - Input Port for creating a transfer.
 */
export interface CreateTransferUseCase {
  createTransfer(requestingUser: User, transfer: Transfer): Transfer;
}