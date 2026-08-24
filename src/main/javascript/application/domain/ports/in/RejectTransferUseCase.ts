import { Transfer } from '../../models/Transfer';
import { User } from '../../models/User';

/**
 * RejectTransferUseCase - Input Port for rejecting a transfer awaiting approval.
 */
export interface RejectTransferUseCase {
  rejectTransfer(requestingUser: User, transfer: Transfer): Transfer;
}