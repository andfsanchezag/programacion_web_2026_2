import { AuditLog } from '../../models/AuditLog';
import { BankingProduct } from '../../models/BankingProduct';
import { User } from '../../models/User';

/**
 * ConsultAuditLogUseCase - Input Port for consulting audit records of a product.
 */
export interface ConsultAuditLogUseCase {
  consultAuditLog(requestingUser: User, product: BankingProduct): AuditLog[];
}