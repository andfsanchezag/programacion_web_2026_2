import { Operation } from '../models/Operation';
import { AuditLog } from '../models/AuditLog';
import { BankingProduct } from '../models/BankingProduct';
import { User } from '../models/User';
import { OperationRepositoryPort } from '../ports/out/OperationRepositoryPort';
import { AuditLogRepositoryPort } from '../ports/out/AuditLogRepositoryPort';
import { RegisterOperationUseCase } from '../ports/in/RegisterOperationUseCase';
import { ConsultOperationsUseCase } from '../ports/in/ConsultOperationsUseCase';
import { RegisterAuditEventUseCase } from '../ports/in/RegisterAuditEventUseCase';
import { ConsultAuditLogUseCase } from '../ports/in/ConsultAuditLogUseCase';
import { OperationNotFoundException, AuditLogNotFoundException } from '../exceptions/operation-audit-errors';

/**
 * OperationAuditService - Manages business operations and audit records for
 * traceability. Does not implement the business rules of originating products.
 */
export class OperationAuditService implements
  RegisterOperationUseCase,
  ConsultOperationsUseCase,
  RegisterAuditEventUseCase,
  ConsultAuditLogUseCase {

  constructor(
    private readonly operationRepository: OperationRepositoryPort,
    private readonly auditRepository: AuditLogRepositoryPort
  ) {}

  registerOperation(operation: Operation): Operation {
    return this.operationRepository.save(operation);
  }

  consultOperations(user: User, product: BankingProduct): Operation[] {
    return this.operationRepository.findByProduct(product);
  }

  registerAuditEvent(auditLog: AuditLog): AuditLog {
    return this.auditRepository.save(auditLog);
  }

  consultAuditLog(user: User, product: BankingProduct): AuditLog[] {
    return this.auditRepository.findByProduct(product);
  }
}