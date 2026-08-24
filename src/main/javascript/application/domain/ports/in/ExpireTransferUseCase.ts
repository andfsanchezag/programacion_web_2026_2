import { Transfer } from '../../models/Transfer';
import { User } from '../../models/User';

/**
 * ExpireTransferUseCase - Input Port for expiring a transfer awaiting approval.
 */
export interface ExpireTransferUseCase {
  expireTransfer(requestingUser: User, transfer: Transfer): Transfer;
}