/**
 * Enums de dominio del frontend — códigos EXACTOS del backend
 * (backendSDD value objects: SystemRole, CustomerStatus, AccountStatus,
 * AccountType, Currency, LoanType, LoanStatus, TransferStatus, OperationType).
 * Los Select usan estos códigos como `value` y las etiquetas como `label`.
 */

export const SYSTEM_ROLES = [
  'NATURAL_CUSTOMER',
  'BUSINESS_CUSTOMER',
  'BUSINESS_OPERATOR',
  'BUSINESS_SUPERVISOR',
  'TELLER_EMPLOYEE',
  'COMMERCIAL_EMPLOYEE',
  'INTERNAL_ANALYST',
] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const ROLE_LABELS: Record<SystemRole, string> = {
  NATURAL_CUSTOMER: 'Cliente natural',
  BUSINESS_CUSTOMER: 'Cliente empresa',
  BUSINESS_OPERATOR: 'Operador de empresa',
  BUSINESS_SUPERVISOR: 'Supervisor de empresa',
  TELLER_EMPLOYEE: 'Cajero de ventanilla',
  COMMERCIAL_EMPLOYEE: 'Ejecutivo comercial',
  INTERNAL_ANALYST: 'Analista interno',
};

/** Ruta de inicio (dashboard) por rol — Frontend-Role-Modules.md §9. */
export const ROLE_HOME: Record<SystemRole, string> = {
  NATURAL_CUSTOMER: '/customer',
  BUSINESS_CUSTOMER: '/business',
  BUSINESS_OPERATOR: '/business/operator',
  BUSINESS_SUPERVISOR: '/business/supervisor',
  TELLER_EMPLOYEE: '/teller',
  COMMERCIAL_EMPLOYEE: '/commercial',
  INTERNAL_ANALYST: '/analyst',
};

export const CUSTOMER_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const ACCOUNT_STATUSES = [
  'ACTIVE',
  'BLOCKED',
  'CLOSED',
  'PENDING_ACTIVATION',
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ACCOUNT_TYPES = ['SAVINGS', 'CHECKING'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  SAVINGS: 'Ahorros',
  CHECKING: 'Corriente',
};

export const CURRENCIES = ['COP', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const LOAN_TYPES = ['PERSONAL', 'BUSINESS', 'HOME'] as const;
export type LoanType = (typeof LOAN_TYPES)[number];

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  PERSONAL: 'Crédito personal',
  BUSINESS: 'Crédito empresarial',
  HOME: 'Crédito de vivienda',
};

export const LOAN_STATUSES = [
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'DISBURSED',
  'CLOSED',
] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const TRANSFER_STATUSES = [
  'PENDING',
  'WAITING_FOR_APPROVAL',
  'APPROVED',
  'REJECTED',
  'EXECUTED',
  'EXPIRED',
] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export const OPERATION_TYPES = [
  'CUSTOMER_REGISTRATION',
  'CUSTOMER_STATUS_CHANGE',
  'USER_REGISTRATION',
  'USER_STATUS_CHANGE',
  'ACCOUNT_OPENING',
  'DEPOSIT',
  'WITHDRAWAL',
  'ACCOUNT_BLOCKING',
  'ACCOUNT_UNBLOCKING',
  'ACCOUNT_CLOSING',
  'TRANSFER_CREATION',
  'TRANSFER_APPROVAL',
  'TRANSFER_REJECTION',
  'TRANSFER_EXECUTION',
  'TRANSFER_EXPIRATION',
  'LOAN_APPLICATION',
  'LOAN_APPROVAL',
  'LOAN_REJECTION',
  'LOAN_DISBURSEMENT',
  'LOAN_PAYMENT',
  'LOAN_OVERDUE',
  'LOAN_CANCELLATION',
  'LOAN_CLOSURE',
] as const;
export type OperationType = (typeof OPERATION_TYPES)[number];

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  CUSTOMER_REGISTRATION: 'Registro de cliente',
  CUSTOMER_STATUS_CHANGE: 'Cambio de estado de cliente',
  USER_REGISTRATION: 'Registro de usuario',
  USER_STATUS_CHANGE: 'Cambio de estado de usuario',
  ACCOUNT_OPENING: 'Apertura de cuenta',
  DEPOSIT: 'Depósito',
  WITHDRAWAL: 'Retiro',
  ACCOUNT_BLOCKING: 'Bloqueo de cuenta',
  ACCOUNT_UNBLOCKING: 'Desbloqueo de cuenta',
  ACCOUNT_CLOSING: 'Cierre de cuenta',
  TRANSFER_CREATION: 'Creación de transferencia',
  TRANSFER_APPROVAL: 'Aprobación de transferencia',
  TRANSFER_REJECTION: 'Rechazo de transferencia',
  TRANSFER_EXECUTION: 'Ejecución de transferencia',
  TRANSFER_EXPIRATION: 'Expiración de transferencia',
  LOAN_APPLICATION: 'Solicitud de crédito',
  LOAN_APPROVAL: 'Aprobación de crédito',
  LOAN_REJECTION: 'Rechazo de crédito',
  LOAN_DISBURSEMENT: 'Desembolso de crédito',
  LOAN_PAYMENT: 'Pago de cuota',
  LOAN_OVERDUE: 'Mora de crédito',
  LOAN_CANCELLATION: 'Cancelación de crédito',
  LOAN_CLOSURE: 'Cierre de crédito',
};
