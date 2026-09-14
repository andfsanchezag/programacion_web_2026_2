import { Operation } from '../models/Operation';
import { AuditLog } from '../models/AuditLog';
import { BankingProduct } from '../models/BankingProduct';
import { User } from '../models/User';
import { OperationRepositoryPort } from '../ports/out/OperationRepositoryPort';
import { AuditLogRepositoryPort } from '../ports/out/AuditLogRepositoryPort';
import { OperationNotFoundException, AuditLogNotFoundException } from '../exceptions/operation-audit-errors';

/**
 * OperationAuditService - Manages business operations and audit records for
 * traceability. Does not implement the business rules of originating products.
 * Async: operations persist to MySQL, audit events to MongoDB.
 */
export class OperationAuditService {

  constructor(
    private readonly operationRepository: OperationRepositoryPort,
    private readonly auditRepository: AuditLogRepositoryPort
  ) {}

  async registerOperation(operation: Operation): Promise<Operation> {
    return this.operationRepository.save(operation);
  }

  async consultOperations(user: User, product: BankingProduct): Promise<Operation[]> {
    return this.operationRepository.findByProduct(product);
  }

  async registerAuditEvent(auditLog: AuditLog): Promise<AuditLog> {
    return this.auditRepository.save(auditLog);
  }

  async consultAuditLog(user: User, product: BankingProduct): Promise<AuditLog[]> {
    return this.auditRepository.findByProduct(product);
  }
}
