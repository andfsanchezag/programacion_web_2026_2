import { Transfer } from '../../models/Transfer';
import { User } from '../../models/User';

/**
 * SubmitTransferForApprovalUseCase - Input Port for submitting a transfer for approval.
 */
export interface SubmitTransferForApprovalUseCase {
  submitForApproval(requestingUser: User, transfer: Transfer): Transfer;
}