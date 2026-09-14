import { Model } from 'mongoose';
import { AuditLog } from '../../../domain/models/AuditLog';
import { User } from '../../../domain/models/User';
import { BankingProduct } from '../../../domain/models/BankingProduct';
import { AuditLogRepositoryPort } from '../../../domain/ports/out/AuditLogRepositoryPort';
import { UserRepositoryPort } from '../../../domain/ports/out/UserRepositoryPort';
import { BankAccountRepositoryPort } from '../../../domain/ports/out/BankAccountRepositoryPort';
import { LoanRepositoryPort } from '../../../domain/ports/out/LoanRepositoryPort';
import { TransferRepositoryPort } from '../../../domain/ports/out/TransferRepositoryPort';
import { AuditLogMongoMapper } from './mappers/AuditLogMongoMapper';
import { AuditLogRow } from './auditLog.model';
import { accountRef, loanRef, transferRef } from '../refs';

/**
 * Adaptador MongoDB puro (colección `audit_logs`, base `audit_db`).
 * Sin estado en memoria: append-only, cada operación va a MongoDB.
 */
export class AuditLogMongoAdapter implements AuditLogRepositoryPort {
  constructor(
    private readonly model: Model<AuditLogRow>,
    private readonly users: UserRepositoryPort,
    private readonly accounts: BankAccountRepositoryPort,
    private readonly loans: LoanRepositoryPort,
    private readonly transfers: TransferRepositoryPort,
  ) {}
  private async findProduct(identifier: string): Promise<BankingProduct | null> {
    return (await this.accounts.find(accountRef(identifier)))
      ?? (await this.loans.find(loanRef(identifier)))
      ?? (await this.transfers.find(transferRef(identifier)));
  }
  private async toDomain(doc: AuditLogRow): Promise<AuditLog | null> {
    const user = await this.users.findByUsername(User.forUsernameLookup(doc.performedByUsername));
    const product = await this.findProduct(doc.affectedProductIdentifier);
    if (!user || !product) return null;
    return AuditLogMongoMapper.toDomain({ ...doc, _id: String(doc._id) }, user, product);
  }
  async save(a: AuditLog): Promise<AuditLog> {
    await this.model.create({ ...AuditLogMongoMapper.toDocument(a) });
    const found = await this.find(a);
    if (!found) throw new Error(`AuditLog ${a.auditId} not persisted`);
    return found;
  }
  async find(a: AuditLog): Promise<AuditLog | null> {
    const doc: AuditLogRow | null = await this.model.findById(a.auditId).lean();
    if (!doc) return null;
    return this.toDomain(doc);
  }
  async findByProduct(p: BankingProduct): Promise<AuditLog[]> {
    const docs: AuditLogRow[] = await this.model.find({ affectedProductIdentifier: p.identifier }).lean();
    const out: AuditLog[] = [];
    for (const doc of docs) {
      const full = await this.toDomain(doc);
      if (full) out.push(full);
    }
    return out;
  }
  async exists(a: AuditLog): Promise<boolean> {
    return (await this.model.countDocuments({ _id: a.auditId })) > 0;
  }
  async findAll(): Promise<AuditLog[]> {
    const docs: AuditLogRow[] = await this.model.find().lean();
    const out: AuditLog[] = [];
    for (const doc of docs) {
      const full = await this.toDomain(doc);
      if (full) out.push(full);
    }
    return out;
  }
}
