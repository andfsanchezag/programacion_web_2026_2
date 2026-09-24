import { BankingProduct } from './BankingProduct';
import { User } from './User';
import { OperationType } from '../valueobjects/OperationType';
import { InvalidOperationException, InvalidOperationUserException, InvalidAffectedProductException } from '../exceptions/operation-audit-errors';

/**
 * Operation - Represents a significant business action performed over a
 * banking product or service.
 */
export class Operation {
  private readonly _operationId: string;
  private readonly _operationType: OperationType;
  private readonly _executionDate: Date;
  private readonly _performedBy: User;
  private readonly _affectedProduct: BankingProduct;

  constructor(
    operationId: string,
    operationType: OperationType,
    executionDate: Date,
    performedBy: User,
    affectedProduct: BankingProduct
  ) {
    if (operationId === null || operationId === undefined || operationId.trim().length === 0) {
      throw new InvalidOperationException('Operation id must not be empty');
    }
    if (operationType === null || operationType === undefined) {
      throw new InvalidOperationException('Operation type must be provided');
    }
    if (performedBy === null || performedBy === undefined) {
      throw new InvalidOperationUserException('Operation user must be provided');
    }
    if (affectedProduct === null || affectedProduct === undefined) {
      throw new InvalidAffectedProductException('Operation affected product must be provided');
    }
    this._operationId = operationId;
    this._operationType = operationType;
    this._executionDate = executionDate;
    this._performedBy = performedBy;
    this._affectedProduct = affectedProduct;
  }

  get operationId(): string {
    return this._operationId;
  }

  get operationType(): OperationType {
    return this._operationType;
  }

  get executionDate(): Date {
    return this._executionDate;
  }

  get performedBy(): User {
    return this._performedBy;
  }

  get affectedProduct(): BankingProduct {
    return this._affectedProduct;
  }
}