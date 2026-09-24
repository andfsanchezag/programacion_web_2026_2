import { EntitySchema } from 'typeorm';

/**
 * Esquemas relacionales TypeORM (sin decoradores) para MySQL 3306, base `bank_db`.
 * `synchronize: true` auto-genera las tablas al iniciar (ddl-auto=update).
 * Los nombres de columna coinciden con las entidades planas de ./entities/entities.ts
 * para reutilizar los mappers bidireccionales dominio ↔ fila.
 */

export interface CustomerRow {
  customerId: string; identification: string; name: string; email: string;
  phone: string; address: string; role: string; status: string; registrationDate: string;
  customerKind: string; nationalId: string | null; taxId: string | null;
  legalRepresentativeIdentification: string | null;
}

export interface UserRow {
  userId: string; identification: string; name: string; email: string;
  phone: string; address: string; role: string; username: string;
  passwordHash: string; status: string; customerIdentification: string | null;
}

export interface BankAccountRow {
  accountNumber: string; accountType: string; customerIdentification: string;
  balance: number; currency: string; status: string; openingDate: string;
}

export interface LoanRow {
  loanId: string; applicantIdentification: string; loanType: string;
  requestedAmount: number; approvedAmount: number; interestRate: number;
  termInMonths: number; status: string; approvalDate: string | null;
  disbursementDate: string | null; destinationAccountNumber: string;
}

export interface TransferRow {
  transferId: string; sourceAccountNumber: string; destinationAccountNumber: string;
  amount: number; creationDate: string; approvalDate: string | null; status: string;
  createdByUsername: string; approvedByUsername: string | null;
}

export interface OperationRow {
  operationId: string; operationType: string; executionDate: string;
  performedByUsername: string; affectedProductIdentifier: string;
}

const decimal = { type: 'decimal' as const, precision: 19, scale: 2 };

export const CustomerSchema = new EntitySchema<CustomerRow>({
  name: 'Customer', tableName: 'customers',
  columns: {
    identification: { type: String, primary: true },
    customerId: { type: String }, name: { type: String }, email: { type: String },
    phone: { type: String }, address: { type: String }, role: { type: String },
    status: { type: String }, registrationDate: { type: String },
    customerKind: { type: String }, nationalId: { type: String, nullable: true },
    taxId: { type: String, nullable: true },
    legalRepresentativeIdentification: { type: String, nullable: true },
  },
});

export const UserSchema = new EntitySchema<UserRow>({
  name: 'User', tableName: 'users',
  columns: {
    username: { type: String, primary: true },
    userId: { type: String }, identification: { type: String }, name: { type: String },
    email: { type: String }, phone: { type: String }, address: { type: String },
    role: { type: String }, passwordHash: { type: String }, status: { type: String },
    customerIdentification: { type: String, nullable: true },
  },
});

export const BankAccountSchema = new EntitySchema<BankAccountRow>({
  name: 'BankAccount', tableName: 'bank_accounts',
  columns: {
    accountNumber: { type: String, primary: true },
    accountType: { type: String }, customerIdentification: { type: String },
    balance: decimal, currency: { type: String },
    status: { type: String }, openingDate: { type: String },
  },
});

export const LoanSchema = new EntitySchema<LoanRow>({
  name: 'Loan', tableName: 'loans',
  columns: {
    loanId: { type: String, primary: true },
    applicantIdentification: { type: String }, loanType: { type: String },
    requestedAmount: decimal, approvedAmount: decimal, interestRate: decimal,
    termInMonths: { type: Number }, status: { type: String },
    approvalDate: { type: String, nullable: true },
    disbursementDate: { type: String, nullable: true },
    destinationAccountNumber: { type: String },
  },
});

export const TransferSchema = new EntitySchema<TransferRow>({
  name: 'Transfer', tableName: 'transfers',
  columns: {
    transferId: { type: String, primary: true },
    sourceAccountNumber: { type: String }, destinationAccountNumber: { type: String },
    amount: decimal, creationDate: { type: String },
    approvalDate: { type: String, nullable: true }, status: { type: String },
    createdByUsername: { type: String }, approvedByUsername: { type: String, nullable: true },
  },
});

export const OperationSchema = new EntitySchema<OperationRow>({
  name: 'Operation', tableName: 'operations',
  columns: {
    operationId: { type: String, primary: true },
    operationType: { type: String }, executionDate: { type: String },
    performedByUsername: { type: String }, affectedProductIdentifier: { type: String },
  },
});

export const ALL_SCHEMAS = [
  CustomerSchema, UserSchema, BankAccountSchema, LoanSchema, TransferSchema, OperationSchema,
];
