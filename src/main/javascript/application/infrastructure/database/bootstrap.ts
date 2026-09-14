import mongoose, { Connection } from 'mongoose';
import { createMysqlDataSource } from './datasource';
import { appConfig } from '../config/appConfig';
import {
  CustomerSchema, UserSchema, BankAccountSchema, LoanSchema, TransferSchema,
  OperationSchema,
} from '../../adapters/persistence/typeorm/schemas';
import {
  BankAccountTypeOrmAdapter, CustomerTypeOrmAdapter, UserTypeOrmAdapter,
  LoanTypeOrmAdapter, TransferTypeOrmAdapter, OperationTypeOrmAdapter,
} from '../../adapters/persistence/typeorm/mysql.adapters';
import { AuditLogMongoAdapter } from '../../adapters/persistence/mongoose/mongo.adapter';
import { getAuditLogModel } from '../../adapters/persistence/mongoose/auditLog.model';

export interface DbAdapters {
  customers: CustomerTypeOrmAdapter; users: UserTypeOrmAdapter; accounts: BankAccountTypeOrmAdapter;
  loans: LoanTypeOrmAdapter; transfers: TransferTypeOrmAdapter; operations: OperationTypeOrmAdapter;
  audits: AuditLogMongoAdapter;
}

export interface BootstrapResult {
  adapters: DbAdapters;
  close: () => Promise<void>;
}

/**
 * Conecta MySQL 3306 (TypeORM, auto-DDL `synchronize`) y Mongo 27017 (Mongoose)
 * y construye los adapters de persistencia. Fail-fast: sin bases de datos no arranca.
 */
export async function bootstrapPersistence(): Promise<BootstrapResult> {
  const ds = createMysqlDataSource();
  await ds.initialize();
  console.log('[bootstrap] MySQL 3306 conectado (bank_db), esquema sincronizado');

  const conn: Connection = await mongoose.createConnection(appConfig.mongoUri, { serverSelectionTimeoutMS: 5000 }).asPromise();
  console.log('[bootstrap] Mongo 27017 conectado (audit_db)');

  const customers = new CustomerTypeOrmAdapter(ds.getRepository(CustomerSchema));
  const users = new UserTypeOrmAdapter(ds.getRepository(UserSchema), customers);
  const accounts = new BankAccountTypeOrmAdapter(ds.getRepository(BankAccountSchema), customers);
  const loans = new LoanTypeOrmAdapter(ds.getRepository(LoanSchema), customers, accounts);
  const transfers = new TransferTypeOrmAdapter(ds.getRepository(TransferSchema), accounts, users);
  const operations = new OperationTypeOrmAdapter(ds.getRepository(OperationSchema), users, accounts, loans, transfers);
  const audits = new AuditLogMongoAdapter(getAuditLogModel(conn), users, accounts, loans, transfers);

  return {
    adapters: { customers, users, accounts, loans, transfers, operations, audits },
    close: async () => {
      try { await conn.close(); } catch { /* noop */ }
      try { await ds.destroy(); } catch { /* noop */ }
    },
  };
}
