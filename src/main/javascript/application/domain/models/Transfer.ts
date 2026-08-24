import { BankingProduct } from './BankingProduct';
import { BankAccount } from './BankAccount';
import { User } from './User';
import { TransferStatus } from '../valueobjects/TransferStatus';
import {
  InvalidTransferException,
  InvalidTransferStatusException,
  TransferAlreadyApprovedException,
  TransferAlreadyRejectedException,
  TransferAlreadyExpiredException,
  InvalidTransferStatusTransitionException,
  TransferAlreadyExecutedException,
} from '../exceptions/transfer-errors';

/**
 * Transfer - A service that moves funds between two bank accounts.
 */
export class Transfer extends BankingProduct {
  private readonly _sourceAccount: BankAccount;
  private readonly _destinationAccount: BankAccount;
  private readonly _amount: number;
  private readonly _creationDate: Date;
  private _approvalDate: Date | null;
  private _transferStatus: TransferStatus;
  private readonly _createdBy: User;
  private _approvedBy: User | null;

  constructor(
    identifier: string,
    sourceAccount: BankAccount,
    destinationAccount: BankAccount,
    amount: number,
    creationDate: Date,
    createdBy: User,
    transferStatus: TransferStatus = TransferStatus.PENDING,
    approvalDate: Date | null = null,
    approvedBy: User | null = null
  ) {
    super(identifier);
    if (sourceAccount === null || sourceAccount === undefined) {
      throw new InvalidTransferException('Transfer source account must be provided');
    }
    if (destinationAccount === null || destinationAccount === undefined) {
      throw new InvalidTransferException('Transfer destination account must be provided');
    }
    if (amount === null || amount === undefined || amount <= 0) {
      throw new InvalidTransferException('Transfer amount must be positive');
    }
    if (sourceAccount.identifier === destinationAccount.identifier) {
      throw new InvalidTransferException('Source and destination accounts must be different');
    }
    this._sourceAccount = sourceAccount;
    this._destinationAccount = destinationAccount;
    this._amount = amount;
    this._creationDate = creationDate;
    this._createdBy = createdBy;
    this._transferStatus = transferStatus;
    this._approvalDate = approvalDate;
    this._approvedBy = approvedBy;
  }

  get sourceAccount(): BankAccount {
    return this._sourceAccount;
  }

  get destinationAccount(): BankAccount {
    return this._destinationAccount;
  }

  get amount(): number {
    return this._amount;
  }

  get creationDate(): Date {
    return this._creationDate;
  }

  get approvalDate(): Date | null {
    return this._approvalDate;
  }

  get transferStatus(): TransferStatus {
    return this._transferStatus;
  }

  get createdBy(): User {
    return this._createdBy;
  }

  get approvedBy(): User | null {
    return this._approvedBy;
  }

  submitForApproval(): void {
    this.assertStatus(TransferStatus.PENDING);
    this._transferStatus = TransferStatus.WAITING_FOR_APPROVAL;
  }

  approve(user: User, approvalDate: Date): void {
    this.assertStatus(TransferStatus.WAITING_FOR_APPROVAL);
    this._approvedBy = user;
    this._approvalDate = approvalDate;
    this._transferStatus = TransferStatus.APPROVED;
  }

  reject(rejectionDate: Date): void {
    if (this._transferStatus.equals(TransferStatus.REJECTED)) {
      throw new TransferAlreadyRejectedException('Transfer has already been rejected');
    }
    if (!this._transferStatus.equals(TransferStatus.PENDING) &&
        !this._transferStatus.equals(TransferStatus.WAITING_FOR_APPROVAL)) {
      throw new InvalidTransferStatusTransitionException(
        'Only pending or waiting-for-approval transfers can be rejected'
      );
    }
    this._approvalDate = rejectionDate;
    this._transferStatus = TransferStatus.REJECTED;
  }

  expire(): void {
    if (this._transferStatus.equals(TransferStatus.EXPIRED)) {
      throw new TransferAlreadyExpiredException('Transfer has already expired');
    }
    if (!this._transferStatus.equals(TransferStatus.WAITING_FOR_APPROVAL)) {
      throw new InvalidTransferStatusTransitionException(
        'Only waiting-for-approval transfers can expire'
      );
    }
    this._transferStatus = TransferStatus.EXPIRED;
  }

  markExecuted(): void {
    this.assertStatus(TransferStatus.APPROVED);
    this._transferStatus = TransferStatus.EXECUTED;
  }

  private assertStatus(expected: TransferStatus): void {
    if (!this._transferStatus.equals(expected)) {
      throw new InvalidTransferStatusException(
        `Transfer must be in status ${expected.code}`
      );
    }
  }
}