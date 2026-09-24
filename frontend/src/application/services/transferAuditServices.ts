/**
 * TransferService + AuditService + SystemService (Frontend-Adapters.md).
 */

import type { HttpPort } from '../../domain/ports';
import type {
  AuditLogSummary,
  HealthStatus,
  OperationSummary,
  PagedResult,
  TransferSummary,
} from '../../domain/models';
import {
  mapAuditLog,
  mapHealth,
  mapList,
  mapOperation,
  mapPaged,
  mapTransfer,
} from '../../adapters/mappers/responseMappers';

export interface CreateTransferInput {
  sourceAccountNumber: string;
  destinationAccountNumber: string;
  amount: number;
  description?: string;
}

export interface AuditFilters {
  userId?: string;
  operationType?: string;
  accountNumber?: string;
  page?: number;
  size?: number;
}

export type TransferRoleContext = 'business-customer' | 'business-supervisor';

export function createTransferService(http: HttpPort) {
  return {
    createNaturalTransfer: (data: CreateTransferInput): Promise<TransferSummary> =>
      http
        .request<unknown>({ method: 'POST', path: '/api/v1/natural-customer/transfers', body: data })
        .then(mapTransfer),

    /** BUSINESS_OPERATOR: responde 202 WAITING_FOR_APPROVAL (fila 88). */
    createBusinessTransfer: (data: CreateTransferInput): Promise<TransferSummary> =>
      http
        .request<unknown>({ method: 'POST', path: '/api/v1/business-operator/transfers', body: data })
        .then(mapTransfer),

    approveTransfer: (transferId: string, roleContext: TransferRoleContext): Promise<TransferSummary> =>
      http
        .request<unknown>({
          method: 'PATCH',
          path: `/api/v1/${roleContext}/transfers/${encodeURIComponent(transferId)}/approve`,
        })
        .then(mapTransfer),

    rejectTransfer: (
      transferId: string,
      data: { rejectionReason: string },
      roleContext: TransferRoleContext,
    ): Promise<TransferSummary> =>
      http
        .request<unknown>({
          method: 'PATCH',
          path: `/api/v1/${roleContext}/transfers/${encodeURIComponent(transferId)}/reject`,
          // Contrato backend: business-customer exige {rejectionReason} (§5.4);
          // business-supervisor declara "Request Body: None" (§7.3 + validación
          // §7.3). Enviar cuerpo al supervisor provocaría 400.
          body: roleContext === 'business-supervisor' ? undefined : data,
        })
        .then(mapTransfer),

    getPendingTransfers: (): Promise<TransferSummary[]> =>
      http
        .request<unknown>({
          method: 'GET',
          path: '/api/v1/business-supervisor/transfers/pending',
        })
        .then((raw) => mapList(raw, mapTransfer)),
  };
}

export type TransferService = ReturnType<typeof createTransferService>;

export function createAuditService(http: HttpPort) {
  return {
    /** GET /natural-customer/operations (fila 82); accountNumber opcional §4.9. */
    getMyOperations: (filters?: { accountNumber?: string }): Promise<OperationSummary[]> =>
      http
        .request<unknown>({
          method: 'GET',
          path: '/api/v1/natural-customer/operations',
          query: { accountNumber: filters?.accountNumber },
        })
        .then((raw) => mapList(raw, mapOperation)),

    /** GET /internal-analyst/audit-logs paginado con filtros (fila 107, §10.5). */
    getAuditLogs: (filters: AuditFilters = {}): Promise<PagedResult<AuditLogSummary>> =>
      http
        .request<unknown>({
          method: 'GET',
          path: '/api/v1/internal-analyst/audit-logs',
          query: {
            userId: filters.userId,
            operationType: filters.operationType,
            accountNumber: filters.accountNumber,
            page: filters.page,
            size: filters.size,
          },
        })
        .then((raw) => mapPaged(raw, mapAuditLog)),
  };
}

export type AuditService = ReturnType<typeof createAuditService>;

export function createSystemService(http: HttpPort) {
  return {
    health: (): Promise<HealthStatus> =>
      http
        .request<unknown>({ method: 'GET', path: '/health', requiresAuth: false })
        .then(mapHealth),
  };
}
