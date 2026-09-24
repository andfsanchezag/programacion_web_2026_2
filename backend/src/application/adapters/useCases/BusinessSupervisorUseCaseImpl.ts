import { BusinessSupervisorPort } from '../../domain/ports/in/BusinessSupervisorPort';
import { User } from '../../domain/models/User';
import { Transfer } from '../../domain/models/Transfer';
import { Operation } from '../../domain/models/Operation';
import { BankingProduct } from '../../domain/models/BankingProduct';
import { TransferService } from '../../domain/services/TransferService';
import { OperationAuditService } from '../../domain/services/OperationAuditService';
import { TransferRepositoryPort } from '../../domain/ports/out/TransferRepositoryPort';
import { TransferStatus } from '../../domain/valueobjects/TransferStatus';

/** Supervisión: pendientes se consultan al puerto (MySQL) filtrando WAITING_FOR_APPROVAL. */
export class BusinessSupervisorUseCaseImpl implements BusinessSupervisorPort {
  constructor(
    private readonly transfers: TransferService,
    private readonly audit: OperationAuditService,
    private readonly transferRepository: TransferRepositoryPort,
  ) {}
  async consultPendingTransfers(_user: User): Promise<Transfer[]> {
    return (await this.transferRepository.findAll())
      .filter((t) => t.transferStatus.equals(TransferStatus.WAITING_FOR_APPROVAL));
  }
  async approveTransfer(user: User, transfer: Transfer): Promise<Transfer> {
    return this.transfers.approveTransfer(user, transfer);
  }
  async rejectTransfer(user: User, transfer: Transfer): Promise<Transfer> {
    return this.transfers.rejectTransfer(user, transfer);
  }
  async consultCompanyOperations(user: User, product: BankingProduct): Promise<Operation[]> {
    return this.audit.consultOperations(user, product);
  }
}
