import { AuditLog } from '../../../../domain/models/AuditLog';
import { User } from '../../../../domain/models/User';
import { BankingProduct } from '../../../../domain/models/BankingProduct';
import { OperationType } from '../../../../domain/valueobjects/OperationType';
import { AuditLogDocument } from '../documents/AuditLogDocument';

/** Mapper bidireccional AuditLog ↔ Documento Mongo. Inmutable y append-only. */
export class AuditLogMongoMapper {
  static toDocument(d: AuditLog): AuditLogDocument {
    const details: Record<string, unknown> = {};
    d.details.forEach((v: unknown, k: string) => { details[k] = v; });
    return {
      _id: d.auditId, operationType: d.operationType.code,
      operationDate: d.operationDate.toISOString(),
      performedByUsername: d.performedBy.username, userRole: d.userRole.code,
      affectedProductIdentifier: d.affectedProduct.identifier, details,
    };
  }
  static toDomain(doc: AuditLogDocument, performedBy: User, product: BankingProduct): AuditLog {
    return new AuditLog(doc._id, OperationType.fromCode(doc.operationType),
      new Date(doc.operationDate), performedBy, product, new Map(Object.entries(doc.details ?? {})));
  }
}
