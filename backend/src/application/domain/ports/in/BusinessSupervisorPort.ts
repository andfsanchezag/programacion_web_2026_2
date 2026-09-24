import { User } from '../../models/User';
import { Transfer } from '../../models/Transfer';
import { Operation } from '../../models/Operation';
import { BankingProduct } from '../../models/BankingProduct';

/** BUSINESS_SUPERVISOR: aprobación y supervisión de operaciones de la empresa. */
export interface BusinessSupervisorPort {
  consultPendingTransfers(user: User): Promise<Transfer[]>;
  approveTransfer(user: User, transfer: Transfer): Promise<Transfer>;
  rejectTransfer(user: User, transfer: Transfer): Promise<Transfer>;
  consultCompanyOperations(user: User, product: BankingProduct): Promise<Operation[]>;
}
