import { DomainCatalog } from './DomainCatalog';

/**
 * OperationType - Represents the type of a significant business operation
 * performed over a banking product or service.
 */
export class OperationType extends DomainCatalog {
  private static readonly VALUES: Map<string, OperationType> = new Map();

  static readonly CUSTOMER_REGISTRATION = OperationType.create('CUSTOMER_REGISTRATION', 'Customer Registration', 'Customer registration operation');
  static readonly CUSTOMER_STATUS_CHANGE = OperationType.create('CUSTOMER_STATUS_CHANGE', 'Customer Status Change', 'Customer status change operation');
  static readonly USER_REGISTRATION = OperationType.create('USER_REGISTRATION', 'User Registration', 'User registration operation');
  static readonly USER_STATUS_CHANGE = OperationType.create('USER_STATUS_CHANGE', 'User Status Change', 'User status change operation');
  static readonly ACCOUNT_OPENING = OperationType.create('ACCOUNT_OPENING', 'Account Opening', 'Account creation operation');
  static readonly DEPOSIT = OperationType.create('DEPOSIT', 'Deposit', 'Deposit operation');
  static readonly WITHDRAWAL = OperationType.create('WITHDRAWAL', 'Withdrawal', 'Withdrawal operation');
  static readonly ACCOUNT_BLOCKING = OperationType.create('ACCOUNT_BLOCKING', 'Account Blocking', 'Account blocking operation');
  static readonly ACCOUNT_UNBLOCKING = OperationType.create('ACCOUNT_UNBLOCKING', 'Account Unblocking', 'Account unblocking operation');
  static readonly ACCOUNT_CLOSING = OperationType.create('ACCOUNT_CLOSING', 'Account Closing', 'Account closing operation');
  static readonly TRANSFER_CREATION = OperationType.create('TRANSFER_CREATION', 'Transfer Creation', 'Transfer creation operation');
  static readonly TRANSFER_APPROVAL = OperationType.create('TRANSFER_APPROVAL', 'Transfer Approval', 'Transfer approval operation');
  static readonly TRANSFER_REJECTION = OperationType.create('TRANSFER_REJECTION', 'Transfer Rejection', 'Transfer rejection operation');
  static readonly TRANSFER_EXECUTION = OperationType.create('TRANSFER_EXECUTION', 'Transfer Execution', 'Transfer execution operation');
  static readonly TRANSFER_EXPIRATION = OperationType.create('TRANSFER_EXPIRATION', 'Transfer Expiration', 'Transfer expiration operation');
  static readonly LOAN_APPLICATION = OperationType.create('LOAN_APPLICATION', 'Loan Application', 'Loan application operation');
  static readonly LOAN_APPROVAL = OperationType.create('LOAN_APPROVAL', 'Loan Approval', 'Loan approval operation');
  static readonly LOAN_REJECTION = OperationType.create('LOAN_REJECTION', 'Loan Rejection', 'Loan rejection operation');
  static readonly LOAN_DISBURSEMENT = OperationType.create('LOAN_DISBURSEMENT', 'Loan Disbursement', 'Loan disbursement operation');
  static readonly LOAN_PAYMENT = OperationType.create('LOAN_PAYMENT', 'Loan Payment', 'Loan payment operation');
  static readonly LOAN_OVERDUE = OperationType.create('LOAN_OVERDUE', 'Loan Overdue', 'Loan overdue operation');
  static readonly LOAN_CANCELLATION = OperationType.create('LOAN_CANCELLATION', 'Loan Cancellation', 'Loan cancellation operation');

  private constructor(code: string, name: string, description: string) {
    super(code, name, description);
  }

  private static create(code: string, name: string, description: string): OperationType {
    const type = new OperationType(code, name, description);
    OperationType.VALUES.set(code, type);
    return type;
  }

  static fromCode(code: string): OperationType {
    const type = OperationType.VALUES.get(code);
    if (!type) {
      throw new InvalidOperationTypeException(`Invalid operation type code: ${code}`);
    }
    return type;
  }

  static getAll(): OperationType[] {
    return Array.from(OperationType.VALUES.values());
  }

  isValid(): boolean {
    return OperationType.VALUES.has(this.code);
  }
}

export class InvalidOperationTypeException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOperationTypeException';
  }
}