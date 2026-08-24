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
import { CreateTransferUseCase } from '../ports/in/CreateTransferUseCase';
import { ExecuteTransferUseCase } from '../ports/in/ExecuteTransferUseCase';
import { SubmitTransferForApprovalUseCase } from '../ports/in/SubmitTransferForApprovalUseCase';
import { ApproveTransferUseCase } from '../ports/in/ApproveTransferUseCase';
import { RejectTransferUseCase } from '../ports/in/RejectTransferUseCase';
import { ExpireTransferUseCase } from '../ports/in/ExpireTransferUseCase';
import { ConsultTransferUseCase } from '../ports/in/ConsultTransferUseCase';
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
export class TransferService implements
  CreateTransferUseCase,
  ExecuteTransferUseCase,
  SubmitTransferForApprovalUseCase,
  ApproveTransferUseCase,
  RejectTransferUseCase,
  ExpireTransferUseCase,
  ConsultTransferUseCase {

  constructor(
    private readonly transferRepository: TransferRepositoryPort,
    private readonly bankAccountRepository: BankAccountRepositoryPort,
    private readonly operationRepository: OperationRepositoryPort,
    private readonly auditRepository: AuditLogRepositoryPort,
    private readonly authorizationPort: AuthorizationPort,
    private readonly configuration: BusinessConfigurationPort
  ) {}

  createTransfer(requestingUser: User, transfer: Transfer): Transfer {
    this.validateTransfer(transfer);
    if (!this.authorizationPort.canExecute(requestingUser, transfer)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to create this transfer'
      );
    }
    if (transfer.amount >= this.configuration.getTransferApprovalThreshold()) {
      transfer.submitForApproval();
    }
    const saved = this.transferRepository.save(transfer);
    this.recordOperation(requestingUser, saved, OperationType.TRANSFER_CREATION);
    return saved;
  }

  submitForApproval(requestingUser: User, transfer: Transfer): Transfer {
    this.assertExists(transfer);
    transfer.submitForApproval();
    this.transferRepository.update(transfer);
    return transfer;
  }

  approveTransfer(requestingUser: User, transfer: Transfer): Transfer {
    if (!this.authorizationPort.canApprove(requestingUser, transfer)) {
      throw new UnauthorizedApprovalException(
        'User is not authorized to approve transfers'
      );
    }
    this.assertExists(transfer);
    transfer.approve(requestingUser, new Date());
    this.transferRepository.update(transfer);
    this.recordOperation(requestingUser, transfer, OperationType.TRANSFER_APPROVAL);
    return transfer;
  }

  rejectTransfer(requestingUser: User, transfer: Transfer): Transfer {
    if (!this.authorizationPort.canApprove(requestingUser, transfer)) {
      throw new UnauthorizedApprovalException(
        'User is not authorized to reject transfers'
      );
    }
    this.assertExists(transfer);
    transfer.reject(new Date());
    this.transferRepository.update(transfer);
    this.recordOperation(requestingUser, transfer, OperationType.TRANSFER_REJECTION);
    return transfer;
  }

  expireTransfer(requestingUser: User, transfer: Transfer): Transfer {
    this.assertExists(transfer);
    if (!this.hasApprovalExpirationPeriodElapsed(transfer)) {
      throw new InvalidTransferException('Transfer approval period has not elapsed');
    }
    transfer.expire();
    this.transferRepository.update(transfer);
    this.recordOperation(requestingUser, transfer, OperationType.TRANSFER_EXPIRATION);
    return transfer;
  }

  executeTransfer(requestingUser: User, transfer: Transfer): Transfer {
    if (!this.authorizationPort.canExecute(requestingUser, transfer)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to execute this transfer'
      );
    }
    this.assertExists(transfer);
    this.assertCanExecute(transfer);
    transfer.sourceAccount.transferOut(transfer.amount);
    transfer.destinationAccount.transferIn(transfer.amount);
    this.bankAccountRepository.update(transfer.sourceAccount);
    this.bankAccountRepository.update(transfer.destinationAccount);
    transfer.markExecuted();
    this.transferRepository.update(transfer);
    this.recordOperation(requestingUser, transfer, OperationType.TRANSFER_EXECUTION);
    return transfer;
  }

  consultTransfer(requestingUser: User, transfer: Transfer): Transfer {
    if (!this.authorizationPort.canExecute(requestingUser, transfer)) {
      throw new UnauthorizedCustomerOperationException(
        'User is not authorized to consult this transfer'
      );
    }
    const found = this.transferRepository.find(transfer);
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

  private assertExists(transfer: Transfer): void {
    if (!this.transferRepository.exists(transfer)) {
      throw new TransferNotFoundException('Transfer not found');
    }
  }

  private recordOperation(user: User, product: Transfer, type: OperationType): void {
    const operation = new Operation(this.newId(), type, new Date(), user, product);
    this.operationRepository.save(operation);
    const audit = new AuditLog(
      this.newId(),
      type,
      new Date(),
      user,
      product,
      new Map<string, unknown>()
    );
    this.auditRepository.save(audit);
  }

  private newId(): string {
    return `id-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }
}