/**
 * Errores de dominio. Puros: sin React, fetch ni SweetAlert2.
 */

import type { ApiError } from './models';

/** Error del backend ya clasificado con la forma estándar. */
export class BackendError extends Error implements ApiError {
  timestamp?: string;
  status: number;
  code: string;
  path?: string;
  requestId?: string;
  details?: unknown;
  sessionExpired?: boolean;

  constructor(init: ApiError) {
    super(init.message);
    this.name = 'BackendError';
    this.status = init.status;
    this.code = init.code;
    this.timestamp = init.timestamp;
    this.path = init.path;
    this.requestId = init.requestId;
    this.details = init.details;
    this.sessionExpired = init.sessionExpired;
  }
}

/** Fallo de red / timeout / sin backend (estado 0). */
export class NetworkError extends Error {
  readonly status = 0;
  readonly code: 'NETWORK_ERROR' | 'NETWORK_TIMEOUT';
  requestId?: string;

  constructor(code: 'NETWORK_ERROR' | 'NETWORK_TIMEOUT', message: string, requestId?: string) {
    super(message);
    this.name = 'NetworkError';
    this.code = code;
    this.requestId = requestId;
  }
}

/** La respuesta del backend no tiene la forma documentada (F3: validar forma antes de exponer a UI). */
export class MappingError extends Error {
  constructor(what: string) {
    super(`Respuesta del servidor con forma inesperada: ${what}`);
    this.name = 'MappingError';
  }
}

export function isBackendError(e: unknown): e is BackendError {
  return e instanceof BackendError;
}

export function isNetworkError(e: unknown): e is NetworkError {
  return e instanceof NetworkError;
}

/** Normaliza cualquier throw a la forma ApiError para presentación. */
export function toApiError(e: unknown): ApiError {
  if (isBackendError(e)) return e;
  if (isNetworkError(e)) {
    return { status: 0, code: e.code, message: e.message, requestId: e.requestId };
  }
  if (e instanceof Error) {
    return { status: 500, code: 'INTERNAL_ERROR', message: e.message };
  }
  return { status: 500, code: 'INTERNAL_ERROR', message: 'Error inesperado' };
}
