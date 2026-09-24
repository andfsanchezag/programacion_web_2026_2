/**
 * AuthenticationService (Frontend-Domain-Services.md §2).
 * Orquesta puertos de dominio; no conoce URLs desde componentes ni fetch.
 */

import type { HttpPort, SessionPort } from '../../domain/ports';
import type { CustomerSummary, Session, UserSummary } from '../../domain/models';
import { mapCustomer, mapLoginResponse, mapUser } from '../../adapters/mappers/responseMappers';

export interface RegisterNaturalCustomerInput {
  identification: string;
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  birthDate: string;
}

export interface RegisterBusinessCustomerInput {
  identification: string;
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  legalRepresentativeIdentification: string;
}

export interface RegisterCustomerUserInput {
  customerIdentification: string;
  username: string;
  password: string;
  role: string;
}

export interface RegisterCompanyUserInput {
  username: string;
  password: string;
  role: string;
  email: string;
  identification: string;
  name: string;
}

export interface RegisterEmployeeUserInput extends RegisterCompanyUserInput {}

export function createAuthService(http: HttpPort, session: SessionPort) {
  return {
    async login(username: string, password: string): Promise<Session> {
      const raw = await http.request<unknown>({
        method: 'POST',
        path: '/api/v1/auth/login',
        body: { username, password },
        requiresAuth: false,
      });
      const mapped = mapLoginResponse(raw);
      session.saveSession(mapped);
      return mapped;
    },

    async logout(): Promise<void> {
      try {
        await http.request<void>({ method: 'POST', path: '/api/v1/auth/logout' });
      } finally {
        session.clearSession();
      }
    },

    async registerNaturalCustomer(data: RegisterNaturalCustomerInput): Promise<CustomerSummary> {
      const raw = await http.request<unknown>({
        method: 'POST',
        path: '/api/v1/auth/register/natural-customer',
        body: data,
        requiresAuth: false,
      });
      return mapCustomer(raw);
    },

    async registerBusinessCustomer(data: RegisterBusinessCustomerInput): Promise<CustomerSummary> {
      const raw = await http.request<unknown>({
        method: 'POST',
        path: '/api/v1/auth/register/business-customer',
        body: data,
        requiresAuth: false,
      });
      return mapCustomer(raw);
    },

    /** Público: POST /auth/register/user (Frontend-Adapters fila 73). */
    async registerCustomerUser(data: RegisterCustomerUserInput): Promise<UserSummary> {
      const raw = await http.request<unknown>({
        method: 'POST',
        path: '/api/v1/auth/register/user',
        body: data,
        requiresAuth: false,
      });
      return mapUser(raw);
    },

    /** Autenticado BUSINESS_CUSTOMER: POST /business-customer/users (fila 84). */
    async registerCompanyUser(data: RegisterCompanyUserInput): Promise<UserSummary> {
      const raw = await http.request<unknown>({
        method: 'POST',
        path: '/api/v1/business-customer/users',
        body: data,
      });
      return mapUser(raw);
    },

    /** INTERNAL_ANALYST: POST /internal-analyst/users/employee (fila 101). */
    async registerEmployeeUser(data: RegisterEmployeeUserInput): Promise<UserSummary> {
      const raw = await http.request<unknown>({
        method: 'POST',
        path: '/api/v1/internal-analyst/users/employee',
        body: data,
      });
      return mapUser(raw);
    },

    getCurrentSession(): Session | null {
      return session.readSession();
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
