import { Transfer } from '../../models/Transfer';
import { User } from '../../models/User';

/**
 * ExecuteTransferUseCase - Input Port for executing an authorized transfer.
 */
export interface ExecuteTransferUseCase {
  executeTransfer(requestingUser: User, transfer: Transfer): Transfer;
}