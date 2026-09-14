import { Schema, Connection, Model } from 'mongoose';

/** Documento de auditoría — colección `audit_logs`, base `audit_db` (puerto 27017). */
export interface AuditLogRow {
  _id: string;
  operationType: string;
  operationDate: string;
  performedByUsername: string;
  userRole: string;
  affectedProductIdentifier: string;
  details: Record<string, unknown>;
}

const AuditLogSchema = new Schema<AuditLogRow>(
  {
    _id: { type: String, required: true },
    operationType: { type: String, required: true, index: true },
    operationDate: { type: String, required: true },
    performedByUsername: { type: String, required: true, index: true },
    userRole: { type: String, required: true },
    affectedProductIdentifier: { type: String, required: true, index: true },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { collection: 'audit_logs', versionKey: false },
);

export function getAuditLogModel(conn: Connection): Model<AuditLogRow> {
  return conn.models.AuditLog ?? conn.model<AuditLogRow>('AuditLog', AuditLogSchema);
}
