/** Documento Mongo de auditoría (colección `audit_logs`, base `audit_db`, puerto 27017). */
export interface AuditLogDocument {
  _id: string;
  operationType: string;
  operationDate: string;
  performedByUsername: string;
  userRole: string;
  affectedProductIdentifier: string;
  details: Record<string, unknown>;
}
