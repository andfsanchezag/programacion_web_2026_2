import { User } from '../../models/User';
import { BankAccount } from '../../models/BankAccount';
import { Transfer } from '../../models/Transfer';
import { Operation } from '../../models/Operation';
import { BankingProduct } from '../../models/BankingProduct';

/** BUSINESS_OPERATOR: transacciones delegadas por la empresa. */
export interface BusinessOperatorPort {
  consultCompanyAccounts(user: User): Promise<BankAccount[]>;
  createCompanyTransfer(user: User, transfer: Transfer): Promise<Transfer>;
  submitTransferForApproval(user: User, transfer: Transfer): Promise<Transfer>;
  consultCompanyOperations(user: User, product: BankingProduct): Promise<Operation[]>;
}
