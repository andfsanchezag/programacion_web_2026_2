/**
 * Mappers de respuesta (F3): validan la forma del DTO del backend ANTES de
 * exponerlo a la UI. Si la forma no coincide → MappingError (nunca datos
 * a medias en componentes). Códigos de error: dominio backend autoritativo.
 */

import { MappingError } from '../../domain/errors';
import type {
  AccountBalance,
  AuditLogSummary,
  AuthUser,
  BankAccountSummary,
  CustomerSummary,
  HealthStatus,
  LoanPaymentResult,
  LoanSummary,
  OperationSummary,
  PagedResult,
  Session,
  TransferSummary,
  UserSummary,
} from '../../domain/models';
import type { OperationType, SystemRole } from '../../domain/enums';
import { OPERATION_TYPES, SYSTEM_ROLES } from '../../domain/enums';

function record(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new MappingError(`${what} debe ser un objeto`);
  }
  return value as Record<string, unknown>;
}

function str(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new MappingError(`campo '${field}'`);
  return value;
}

function num(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new MappingError(`campo '${field}'`);
  return value;
}

function role(value: unknown): SystemRole {
  const code = str(value, 'role');
  if (!(SYSTEM_ROLES as readonly string[]).includes(code)) throw new MappingError(`role desconocido '${code}'`);
  return code as SystemRole;
}

function operationType(value: unknown): OperationType {
  const code = str(value, 'operationType');
  if (!(OPERATION_TYPES as readonly string[]).includes(code)) throw new MappingError(`operationType desconocido '${code}'`);
  return code as OperationType;
}

function array(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) throw new MappingError(`${what} debe ser una lista`);
  return value;
}

export function mapLoginResponse(dto: unknown): Session {
  const d = record(dto, 'LoginResponseDTO');
  const user = record(d['user'], 'user');
  const expiresIn = num(d['expiresIn'], 'expiresIn');
  const authUser: AuthUser = {
    userId: str(user['userId'], 'userId'),
    username: str(user['username'], 'username'),
    email: typeof user['email'] === 'string' ? user['email'] : '',
    role: role(user['role']),
  };
  return {
    token: str(d['token'], 'token'),
    tokenType: str(d['tokenType'], 'tokenType'),
    expiresIn,
    expiresAt: Date.now() + expiresIn * 1000,
    user: authUser,
  };
}

export function mapCustomer(dto: unknown): CustomerSummary {
  const d = record(dto, 'CustomerResponseDTO');
  const type = str(d['customerType'], 'customerType');
  if (type !== 'NATURAL' && type !== 'BUSINESS') throw new MappingError(`customerType '${type}'`);
  const result: CustomerSummary = {
    identification: str(d['identification'], 'identification'),
    name: str(d['name'], 'name'),
    email: str(d['email'], 'email'),
    status: str(d['status'], 'status') as CustomerSummary['status'],
    customerType: type,
  };
  const repDto = d['legalRepresentative'];
  if (repDto !== undefined && repDto !== null) {
    const rep = record(repDto, 'legalRepresentative');
    result.legalRepresentative = {
      identification: str(rep['identification'], 'identification'),
      name: str(rep['name'], 'name'),
    };
  }
  return result;
}

export function mapAccount(dto: unknown): BankAccountSummary {
  const d = record(dto, 'BankAccountResponseDTO');
  return {
    accountNumber: str(d['accountNumber'], 'accountNumber'),
    accountType: str(d['accountType'], 'accountType') as BankAccountSummary['accountType'],
    ownerIdentification: str(d['ownerIdentification'], 'ownerIdentification'),
    availableBalance: num(d['availableBalance'], 'availableBalance'),
    currency: str(d['currency'], 'currency') as BankAccountSummary['currency'],
    status: str(d['status'], 'status') as BankAccountSummary['status'],
  };
}

export function mapBalance(dto: unknown): AccountBalance {
  const d = record(dto, 'AccountBalanceResponseDTO');
  return {
    accountNumber: str(d['accountNumber'], 'accountNumber'),
    availableBalance: num(d['availableBalance'], 'availableBalance'),
    currency: str(d['currency'], 'currency') as AccountBalance['currency'],
  };
}

export function mapLoan(dto: unknown): LoanSummary {
  const d = record(dto, 'LoanResponseDTO');
  const result: LoanSummary = {
    loanId: str(d['loanId'], 'loanId'),
    loanType: str(d['loanType'], 'loanType') as LoanSummary['loanType'],
    requestedAmount: num(d['requestedAmount'], 'requestedAmount'),
    status: str(d['status'], 'status') as LoanSummary['status'],
    termInMonths: num(d['termInMonths'], 'termInMonths'),
  };
  if (typeof d['approvedAmount'] === 'number') result.approvedAmount = d['approvedAmount'];
  return result;
}

export function mapLoanPayment(dto: unknown): LoanPaymentResult {
  const d = record(dto, 'LoanPaymentResponseDTO');
  return {
    loanId: str(d['loanId'], 'loanId'),
    status: str(d['status'], 'status') as LoanPaymentResult['status'],
  };
}

export function mapTransfer(dto: unknown): TransferSummary {
  const d = record(dto, 'TransferResponseDTO');
  const result: TransferSummary = {
    transferId: str(d['transferId'], 'transferId'),
    sourceAccountNumber: str(d['sourceAccountNumber'], 'sourceAccountNumber'),
    destinationAccountNumber: str(d['destinationAccountNumber'], 'destinationAccountNumber'),
    amount: num(d['amount'], 'amount'),
    status: str(d['status'], 'status') as TransferSummary['status'],
  };
  if (typeof d['executedAt'] === 'string') result.executedAt = d['executedAt'];
  return result;
}

export function mapOperation(dto: unknown): OperationSummary {
  const d = record(dto, 'OperationResponseDTO');
  return {
    operationId: str(d['operationId'], 'operationId'),
    operationType: operationType(d['operationType']),
    executionDate: str(d['executionDate'], 'executionDate'),
    performedBy: str(d['performedBy'], 'performedBy'),
    affectedProduct: str(d['affectedProduct'], 'affectedProduct'),
  };
}

export function mapAuditLog(dto: unknown): AuditLogSummary {
  const d = record(dto, 'AuditLogResponseDTO');
  return {
    auditId: str(d['auditId'], 'auditId'),
    operationType: operationType(d['operationType']),
    operationDate: str(d['operationDate'], 'operationDate'),
    performedBy: str(d['performedBy'], 'performedBy'),
    userRole: role(d['userRole']),
    affectedProduct: str(d['affectedProduct'], 'affectedProduct'),
    details:
      typeof d['details'] === 'object' && d['details'] !== null && !Array.isArray(d['details'])
        ? (d['details'] as Record<string, unknown>)
        : {},
  };
}

export function mapUser(dto: unknown): UserSummary {
  const d = record(dto, 'UserResponseDTO');
  return {
    userId: str(d['userId'], 'userId'),
    username: str(d['username'], 'username'),
    role: role(d['role']),
    status: str(d['status'], 'status'),
  };
}

export function mapPaged<T>(dto: unknown, mapItem: (item: unknown) => T): PagedResult<T> {
  const d = record(dto, 'PagedResult');
  return {
    content: array(d['content'], 'content').map(mapItem),
    totalElements: num(d['totalElements'], 'totalElements'),
    totalPages: num(d['totalPages'], 'totalPages'),
  };
}

export function mapList<T>(dto: unknown, mapItem: (item: unknown) => T): T[] {
  return array(dto, 'lista').map(mapItem);
}

export function mapHealth(dto: unknown): HealthStatus {
  const d = record(dto, 'HealthResponse');
  return {
    status: str(d['status'], 'status'),
    persistence: typeof d['persistence'] === 'string' ? d['persistence'] : undefined,
  };
}
