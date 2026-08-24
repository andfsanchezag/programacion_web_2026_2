import { AuditLog } from '../../models/AuditLog';

/**
 * RegisterAuditEventUseCase - Input Port for registering an immutable audit record.
 */
export interface RegisterAuditEventUseCase {
  registerAuditEvent(auditLog: AuditLog): AuditLog;
}