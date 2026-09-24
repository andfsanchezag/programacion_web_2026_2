/**
 * Modelos de dominio transport-safe (Frontend-Domain-Services.md §1).
 * Sin entidades de persistencia ni tipos de Spring/Express/ORM.
 * Ningún modelo importa React, fetch, Axios ni SweetAlert2.
 */

import type { SystemRole, CustomerStatus, AccountStatus, AccountType, Currency, LoanType, LoanStatus, TransferStatus, OperationType } from './enums';

export interface AuthUser {
  userId: string;
  username: string;
  email: string;
  role: SystemRole;
}

export interface Session {
  token: string;
  tokenType: string;
  expiresIn: number;
  /** Epoch ms calculado en el adapter de sesión a partir de expiresIn. */
  expiresAt: number;
  user: AuthUser;
}

export interface CustomerSummary {
  identification: string;
  name: string;
  email: string;
  status: CustomerStatus;
  customerType: 'NATURAL' | 'BUSINESS';
  legalRepresentative?: { identification: string; name: string };
}

export interface BankAccountSummary {
  accountNumber: string;
  accountType: AccountType;
  ownerIdentification: string;
  availableBalance: number;
  currency: Currency;
  status: AccountStatus;
}

export interface AccountBalance {
  accountNumber: string;
  availableBalance: number;
  currency: Currency;
}

export interface LoanSummary {
  loanId: string;
  loanType: LoanType;
  requestedAmount: number;
  approvedAmount?: number;
  status: LoanStatus;
  termInMonths: number;
}

export interface LoanPaymentResult {
  loanId: string;
  status: LoanStatus;
}

export interface TransferSummary {
  transferId: string;
  sourceAccountNumber: string;
  destinationAccountNumber: string;
  amount: number;
  status: TransferStatus;
  executedAt?: string;
}

export interface OperationSummary {
  operationId: string;
  operationType: OperationType;
  executionDate: string;
  performedBy: string;
  affectedProduct: string;
}

export interface AuditLogSummary {
  auditId: string;
  operationType: OperationType;
  operationDate: string;
  performedBy: string;
  userRole: SystemRole;
  affectedProduct: string;
  details: Record<string, unknown>;
}

export interface UserSummary {
  userId: string;
  username: string;
  role: SystemRole;
  status: string;
}

export interface PagedResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

/** Envoltorio de error del backend (Global-exception-handler.md §3). */
export interface ApiError {
  timestamp?: string;
  status: number;
  code: string;
  message: string;
  path?: string;
  requestId?: string;
  details?: unknown;
  /** true cuando un 401 de petición protegida ya limpió la sesión en el HTTP adapter. */
  sessionExpired?: boolean;
}

/** Formato de salud del backend: GET /health → { status, persistence }. */
export interface HealthStatus {
  status: string;
  persistence?: string;
}
