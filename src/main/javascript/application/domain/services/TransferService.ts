import { Transfer } from '../models/Transfer';
import { User } from '../models/User';
import { Operation } from '../models/Operation';
import { AuditLog } from '../models/AuditLog';
import { OperationType } from '../valueobjects/OperationType';
import { TransferRepositoryPort } from '../ports/out/TransferRepositoryPort';
import { BankAccountRepositoryPort } from '../ports/out/BankAccountRepositoryPort';
import { OperationRepositoryPort } from '../ports/out/OperationRepositoryPort';
import { AuditLogRepositoryPort } from '../ports/out/AuditLogRepositoryPort';
import { AuthorizationPort } from '../ports/out/AuthorizationPort';
import { BusinessConfigurationPort } from '../ports/out/BusinessConfigurationPort';
import {
  TransferNotFoundException,
  InvalidTransferException,
  InvalidTransferAmountException,
  TransferNotApprovedException,
} from '../exceptions/transfer-errors';
import { UnauthorizedApprovalException } from '../exceptions/authorization-errors';
import { UnauthorizedCustomerOperationException } from '../exceptions/customer-errors';

/**
 * TransferService - Coordinates the transfer lifecycle business operations.
 */
export class TransferService {

  constructor(
    private readonly transferRepository: TransferRepositoryPort,
    private readonly bankAccountRepository: BankAccountRepositoryPort,
    private readonly operationRepository: OperationRepositoryPort,
    private readonly auditRepository: AuditLogRepositoryPort,
    private readonly authorizationPort: AuthorizationPort,
    private readonly configuration: BusinessConfigurationPort
  ) {}

  async createTransfer(requestingUser: User, transfer: Transfer): Promise<Transfer> {
    this.validateTransfer(transfer);
    if (!this.authorizationPort.canExecute(requestingUser, transfer)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to create this transfer'
      );
    }
    if (transfer.amount >= this.configuration.getTransferApprovalThreshold()) {
      transfer.submitForApproval();
    }
    const saved = await this.transferRepository.save(transfer);
    await this.recordOperation(requestingUser, saved, OperationType.TRANSFER_CREATION);
    return saved;
  }

  async submitForApproval(requestingUser: User, transfer: Transfer): Promise<Transfer> {
    await this.assertExists(transfer);
    transfer.submitForApproval();
    await this.transferRepository.update(transfer);
    return transfer;
  }

  async approveTransfer(requestingUser: User, transfer: Transfer): Promise<Transfer> {
    if (!this.authorizationPort.canApprove(requestingUser, transfer)) {
      throw new UnauthorizedApprovalException(
        'User is not authorized to approve transfers'
      );
    }
    await this.assertExists(transfer);
    transfer.approve(requestingUser, new Date());
    await this.transferRepository.update(transfer);
    await this.recordOperation(requestingUser, transfer, OperationType.TRANSFER_APPROVAL);
    return transfer;
  }

  async rejectTransfer(requestingUser: User, transfer: Transfer): Promise<Transfer> {
    if (!this.authorizationPort.canApprove(requestingUser, transfer)) {
      throw new UnauthorizedApprovalException(
        'User is not authorized to reject transfers'
      );
    }
    await this.assertExists(transfer);
    transfer.reject(new Date());
    await this.transferRepository.update(transfer);
    await this.recordOperation(requestingUser, transfer, OperationType.TRANSFER_REJECTION);
    return transfer;
  }

  async expireTransfer(requestingUser: User, transfer: Transfer): Promise<Transfer> {
    await this.assertExists(transfer);
    if (!this.hasApprovalExpirationPeriodElapsed(transfer)) {
      throw new InvalidTransferException('Transfer approval period has not elapsed');
    }
    transfer.expire();
    await this.transferRepository.update(transfer);
    await this.recordOperation(requestingUser, transfer, OperationType.TRANSFER_EXPIRATION);
    return transfer;
  }

  async executeTransfer(requestingUser: User, transfer: Transfer): Promise<Transfer> {
    if (!this.authorizationPort.canExecute(requestingUser, transfer)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to execute this transfer'
      );
    }
    await this.assertExists(transfer);
    this.assertCanExecute(transfer);
    transfer.sourceAccount.transferOut(transfer.amount);
    transfer.destinationAccount.transferIn(transfer.amount);
    await this.bankAccountRepository.update(transfer.sourceAccount);
    await this.bankAccountRepository.update(transfer.destinationAccount);
    transfer.markExecuted();
    await this.transferRepository.update(transfer);
    await this.recordOperation(requestingUser, transfer, OperationType.TRANSFER_EXECUTION);
    return transfer;
  }

  async consultTransfer(requestingUser: User, transfer: Transfer): Promise<Transfer> {
    if (!this.authorizationPort.canExecute(requestingUser, transfer)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to consult this transfer'
      );
    }
    const found = await this.transferRepository.find(transfer);
    if (found === null || found === undefined) {
      throw new TransferNotFoundException('Transfer not found');
    }
    return found;
  }

  private validateTransfer(transfer: Transfer): void {
    if (transfer.amount <= 0) {
      throw new InvalidTransferAmountException('Transfer amount must be positive');
    }
  }

  private assertCanExecute(transfer: Transfer): void {
    if (!transfer.transferStatus.canBeExecuted()) {
      throw new TransferNotApprovedException(
        'Transfer must be approved before execution'
      );
    }
  }

  private hasApprovalExpirationPeriodElapsed(transfer: Transfer): boolean {
    const now = Date.now();
    const hours = this.configuration.getTransferApprovalExpirationHours();
    const elapsedMs = now - transfer.creationDate.getTime();
    return elapsedMs >= hours * 3600 * 1000;
  }

  private async assertExists(transfer: Transfer): Promise<void> {
    if (!(await this.transferRepository.exists(transfer))) {
      throw new TransferNotFoundException('Transfer not found');
    }
  }

  private async recordOperation(user: User, product: Transfer, type: OperationType): Promise<void> {
    const operation = new Operation(this.newId(), type, new Date(), user, product);
    await this.operationRepository.save(operation);
    const audit = new AuditLog(
      this.newId(),
      type,
      new Date(),
      user,
      product,
      new Map<string, unknown>()
    );
    await this.auditRepository.save(audit);
  }

  private newId(): string {
    return `id-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }
}
