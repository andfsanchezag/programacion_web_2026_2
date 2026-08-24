import { Transfer } from '../../models/Transfer';
import { User } from '../../models/User';

/**
 * ApproveTransferUseCase - Input Port for approving a transfer requiring approval.
 */
export interface ApproveTransferUseCase {
  approveTransfer(requestingUser: User, transfer: Transfer): Transfer;
}