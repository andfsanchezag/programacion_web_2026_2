/**
 * Puertos de dominio (Frontend-Architecture.md §3).
 * Solo interfaces puras: sin React, sin browser globals, sin fetch ni SweetAlert2.
 */

import type { Session } from './models';
import type { ApiError } from './models';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HttpRequestOptions {
  method: HttpMethod;
  /** Ruta relativa a la base, ej. `/api/v1/auth/login`. Nunca se arma en componentes. */
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** false omite Authorization (peticiones públicas). Default: true. */
  requiresAuth?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Único puerto que contacta al backend. Implementado por adapters/http.
 * Rechaza con BackendError (forma estándar) o NetworkError (timeout/red).
 */
export interface HttpPort {
  request<T>(options: HttpRequestOptions): Promise<T>;
}

/** Único puerto que lee/escribe el JWT (sessionStorage, nunca passwords). */
export interface SessionPort {
  saveSession(session: Session): void;
  readSession(): Session | null;
  getAccessToken(): string | null;
  clearSession(): void;
  isExpired(): boolean;
}

export interface ConfirmFinancialConfig {
  title: string;
  /** Identidad financiera explícita: monto, cuenta, destino o crédito. */
  details: Array<{ label: string; value: string }>;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

/** Único puerto que invoca SweetAlert2. */
export interface AlertPort {
  showValidationError(error: ApiError): Promise<void>;
  showAuthenticationError(error: ApiError): Promise<void>;
  showAuthorizationError(error: ApiError): Promise<void>;
  showConflict(error: ApiError): Promise<void>;
  showDependencyError(error: ApiError): Promise<void>;
  showUnexpectedError(error: ApiError): Promise<void>;
  confirmFinancialAction(config: ConfirmFinancialConfig): Promise<boolean>;
  showSuccess(message: string): Promise<void>;
  showExpiredSession(message: string): Promise<void>;
}

/** Notificación de cambio de sesión para el router (401 → login). */
export type SessionListener = (event: { type: 'expired' | 'signed-in' | 'signed-out' }) => void;
