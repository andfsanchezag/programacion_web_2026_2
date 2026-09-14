import { BusinessOperatorPort } from '../../domain/ports/in/BusinessOperatorPort';
import { User } from '../../domain/models/User';
import { BankAccount } from '../../domain/models/BankAccount';
import { Transfer } from '../../domain/models/Transfer';
import { Operation } from '../../domain/models/Operation';
import { BankingProduct } from '../../domain/models/BankingProduct';
import { CustomerService } from '../../domain/services/CustomerService';
import { TransferService } from '../../domain/services/TransferService';
import { OperationAuditService } from '../../domain/services/OperationAuditService';

export class BusinessOperatorUseCaseImpl implements BusinessOperatorPort {
  constructor(
    private readonly customers: CustomerService,
    private readonly transfers: TransferService,
    private readonly audit: OperationAuditService,
  ) {}
  async consultCompanyAccounts(user: User): Promise<BankAccount[]> {
    if (!user.customer) throw new Error('Usuario sin empresa asociada');
    return (await this.customers.consultProducts(user, user.customer))
      .filter((p): p is BankAccount => p instanceof BankAccount);
  }
  async createCompanyTransfer(user: User, transfer: Transfer): Promise<Transfer> {
    return this.transfers.createTransfer(user, transfer);
  }
  async submitTransferForApproval(user: User, transfer: Transfer): Promise<Transfer> {
    return this.transfers.submitForApproval(user, transfer);
  }
  async consultCompanyOperations(user: User, product: BankingProduct): Promise<Operation[]> {
    return this.audit.consultOperations(user, product);
  }
}
