import { BankingProduct } from './BankingProduct';
import { User } from './User';
import { OperationType } from '../valueobjects/OperationType';
import { SystemRole } from '../valueobjects/SystemRole';
import { InvalidAuditLogException, InvalidAuditInformationException } from '../exceptions/operation-audit-errors';

/**
 * AuditLog - Represents the immutable historical record of a significant
 * business event. Audit records are immutable and append-only.
 */
export class AuditLog {
  private readonly _auditId: string;
  private readonly _operationType: OperationType;
  private readonly _operationDate: Date;
  private readonly _performedBy: User;
  private readonly _userRole: SystemRole;
  private readonly _affectedProduct: BankingProduct;
  private readonly _details: Map<string, unknown>;

  constructor(
    auditId: string,
    operationType: OperationType,
    operationDate: Date,
    performedBy: User,
    affectedProduct: BankingProduct,
    details: Map<string, unknown>
  ) {
    if (auditId === null || auditId === undefined || auditId.trim().length === 0) {
      throw new InvalidAuditLogException('Audit id must not be empty');
    }
    if (operationType === null || operationType === undefined) {
      throw new InvalidAuditLogException('Audit operation type must be provided');
    }
    if (performedBy === null || performedBy === undefined) {
      throw new InvalidAuditLogException('Audit user must be provided');
    }
    if (affectedProduct === null || affectedProduct === undefined) {
      throw new InvalidAuditLogException('Audit affected product must be provided');
    }
    if (details === null || details === undefined) {
      throw new InvalidAuditInformationException('Audit details must be provided');
    }
    this._auditId = auditId;
    this._operationType = operationType;
    this._operationDate = operationDate;
    this._performedBy = performedBy;
    this._userRole = performedBy.role;
    this._affectedProduct = affectedProduct;
    this._details = new Map(details);
  }

  get auditId(): string {
    return this._auditId;
  }

  get operationType(): OperationType {
    return this._operationType;
  }

  get operationDate(): Date {
    return this._operationDate;
  }

  get performedBy(): User {
    return this._performedBy;
  }

  get userRole(): SystemRole {
    return this._userRole;
  }

  get affectedProduct(): BankingProduct {
    return this._affectedProduct;
  }

  get details(): ReadonlyMap<string, unknown> {
    return this._details;
  }
}