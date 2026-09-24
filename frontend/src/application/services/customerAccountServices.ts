/**
 * CustomerService + AccountService + TransferService + LoanService +
 * AuditService + SystemService (Frontend-Domain-Services.md §2-§3).
 * Cada método valida la respuesta con mappers antes de devolverla.
 * El roleContext de transferencias elige el prefijo autorizado por rol.
 */

import type { HttpPort } from '../../domain/ports';
import type {
  AccountBalance,
  BankAccountSummary,
  CustomerSummary,
} from '../../domain/models';
import {
  mapAccount,
  mapBalance,
  mapCustomer,
  mapList,
} from '../../adapters/mappers/responseMappers';

export type TransferRoleContext = 'business-customer' | 'business-supervisor';

export interface AuditFilters {
  userId?: string;
  operationType?: string;
  accountNumber?: string;
  page?: number;
  size?: number;
}

export function createCustomerService(http: HttpPort) {
  return {
    getMyProfile: (): Promise<CustomerSummary> =>
      http
        .request<unknown>({ method: 'GET', path: '/api/v1/natural-customer/profile' })
        .then(mapCustomer),

    updateMyProfile: (data: { email?: string; phoneNumber?: string; address?: string }): Promise<CustomerSummary> =>
      http
        .request<unknown>({ method: 'PUT', path: '/api/v1/natural-customer/profile', body: data })
        .then(mapCustomer),

    getCompanyProfile: (): Promise<CustomerSummary> =>
      http
        .request<unknown>({ method: 'GET', path: '/api/v1/business-customer/profile' })
        .then(mapCustomer),

    /** Teller: GET /teller/customers?identification= (fila 94). */
    getCustomer: (identification: string): Promise<CustomerSummary> =>
      http
        .request<unknown>({
          method: 'GET',
          path: '/api/v1/teller/customers',
          query: { identification },
        })
        .then(mapCustomer),

    /** INTERNAL_ANALYST: PATCH /internal-analyst/customers/{id}/status (fila 102). */
    changeCustomerStatus: (
      identification: string,
      data: { status: string; reason?: string },
    ): Promise<CustomerSummary> =>
      http
        .request<unknown>({
          method: 'PATCH',
          path: `/api/v1/internal-analyst/customers/${encodeURIComponent(identification)}/status`,
          body: data,
        })
        .then(mapCustomer),
  };
}

export function createAccountService(http: HttpPort) {
  return {
    getMyAccounts: (): Promise<BankAccountSummary[]> =>
      http
        .request<unknown>({ method: 'GET', path: '/api/v1/natural-customer/accounts' })
        .then((raw) => mapList(raw, mapAccount)),

    /** BUSINESS_OPERATOR: GET /business-operator/accounts (fila 87). */
    getCompanyAccounts: (): Promise<BankAccountSummary[]> =>
      http
        .request<unknown>({ method: 'GET', path: '/api/v1/business-operator/accounts' })
        .then((raw) => mapList(raw, mapAccount)),

    /** Teller consulta cuenta: GET /teller/accounts/{n} (fila 96). */
    getAccount: (accountNumber: string): Promise<BankAccountSummary> =>
      http
        .request<unknown>({
          method: 'GET',
          path: `/api/v1/teller/accounts/${encodeURIComponent(accountNumber)}`,
        })
        .then(mapAccount),

    getBalance: (accountNumber: string): Promise<AccountBalance> =>
      http
        .request<unknown>({
          method: 'GET',
          path: `/api/v1/natural-customer/accounts/${encodeURIComponent(accountNumber)}/balance`,
        })
        .then(mapBalance),

    openAccount: (data: {
      accountNumber?: string;
      accountType: string;
      currency: string;
      ownerIdentification: string;
    }): Promise<BankAccountSummary> =>
      http
        .request<unknown>({ method: 'POST', path: '/api/v1/teller/accounts', body: data })
        .then(mapAccount),

    deposit: (accountNumber: string, data: { amount: number; reference?: string }): Promise<AccountBalance> =>
      http
        .request<unknown>({
          method: 'POST',
          path: `/api/v1/teller/accounts/${encodeURIComponent(accountNumber)}/deposits`,
          body: data,
        })
        .then(mapBalance),

    withdraw: (accountNumber: string, data: { amount: number; clientIdentification?: string }): Promise<AccountBalance> =>
      http
        .request<unknown>({
          method: 'POST',
          path: `/api/v1/teller/accounts/${encodeURIComponent(accountNumber)}/withdrawals`,
          body: data,
        })
        .then(mapBalance),

    blockAccount: (accountNumber: string, reason?: string): Promise<BankAccountSummary> =>
      http
        .request<unknown>({
          method: 'PATCH',
          path: `/api/v1/teller/accounts/${encodeURIComponent(accountNumber)}/block`,
          body: reason ? { reason } : undefined,
        })
        .then(mapAccount),

    unblockAccount: (accountNumber: string): Promise<BankAccountSummary> =>
      http
        .request<unknown>({
          method: 'PATCH',
          path: `/api/v1/teller/accounts/${encodeURIComponent(accountNumber)}/unblock`,
        })
        .then(mapAccount),

    closeAccount: (accountNumber: string): Promise<BankAccountSummary> =>
      http
        .request<unknown>({
          method: 'PATCH',
          path: `/api/v1/teller/accounts/${encodeURIComponent(accountNumber)}/close`,
        })
        .then(mapAccount),
  };
}
