import { Transfer } from '../../models/Transfer';
import { User } from '../../models/User';

/**
 * ConsultTransferUseCase - Input Port for consulting a transfer.
 */
export interface ConsultTransferUseCase {
  consultTransfer(requestingUser: User, transfer: Transfer): Transfer;
}