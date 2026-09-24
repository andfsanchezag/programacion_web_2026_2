import { DomainCatalog } from './DomainCatalog';

/**
 * TransferStatus - Represents the lifecycle state of a fund transfer.
 */
export class TransferStatus extends DomainCatalog {
  private static readonly VALUES: Map<string, TransferStatus> = new Map();

  static readonly PENDING = TransferStatus.create('PENDING', 'Pending', 'Transfer is pending creation');
  static readonly WAITING_FOR_APPROVAL = TransferStatus.create('WAITING_FOR_APPROVAL', 'Waiting for Approval', 'Transfer awaits authorization');
  static readonly APPROVED = TransferStatus.create('APPROVED', 'Approved', 'Transfer has been approved');
  static readonly REJECTED = TransferStatus.create('REJECTED', 'Rejected', 'Transfer has been rejected');
  static readonly EXECUTED = TransferStatus.create('EXECUTED', 'Executed', 'Transfer has been executed');
  static readonly EXPIRED = TransferStatus.create('EXPIRED', 'Expired', 'Transfer expired awaiting approval');

  private constructor(code: string, name: string, description: string) {
    super(code, name, description);
  }

  private static create(code: string, name: string, description: string): TransferStatus {
    const status = new TransferStatus(code, name, description);
    TransferStatus.VALUES.set(code, status);
    return status;
  }

  static fromCode(code: string): TransferStatus {
    const status = TransferStatus.VALUES.get(code);
    if (!status) {
      throw new InvalidTransferStatusException(`Invalid transfer status code: ${code}`);
    }
    return status;
  }

  static getAll(): TransferStatus[] {
    return Array.from(TransferStatus.VALUES.values());
  }

  isValid(): boolean {
    return TransferStatus.VALUES.has(this.code);
  }

  canBeExecuted(): boolean {
    return this.equals(TransferStatus.APPROVED);
  }
}

export class InvalidTransferStatusException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTransferStatusException';
  }
}