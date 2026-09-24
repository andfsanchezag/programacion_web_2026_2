/**
 * Adaptador HTTP — única capa que contacta VITE_API_BASE_URL (F2).
 *
 * Reglas implementadas (Frontend-Adapters.md §1):
 * - API base desde `VITE_API_BASE_URL` (default http://localhost:8080)
 * - JSON: Content-Type + Accept application/json
 * - Authorization: Bearer <token> en peticiones protegidas
 * - X-Request-Id generado y propagado en cada petición
 * - timeout con AbortController + cancelación externa
 * - mapeo del envoltorio de error estándar a BackendError
 * - 401 en petición protegida → limpia sesión + notifica expired
 * - 403 conserva sesión (la alerta la dispara el presentador de errores)
 */

import type { HttpPort, HttpRequestOptions, SessionPort, SessionListener } from '../../domain/ports';
import { BackendError, NetworkError } from '../../domain/errors';
import type { ApiError } from '../../domain/models';

const DEFAULT_TIMEOUT_MS = 15000;

export function apiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return (fromEnv && fromEnv.trim().length > 0 ? fromEnv : 'http://localhost:8080').replace(/\/+$/, '');
}

function newRequestId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return `req-${c.randomUUID()}`;
  return `req-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

function buildUrl(path: string, query?: HttpRequestOptions['query']): string {
  const url = new URL(path, `${apiBaseUrl()}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function isErrorEnvelope(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v['status'] === 'number' && typeof v['code'] === 'string' && typeof v['message'] === 'string';
}

export interface HttpAdapterDeps {
  session: SessionPort;
  onSessionEvent?: SessionListener;
}

function fallbackError(status: number, requestId: string | undefined): ApiError {
  const code =
    status === 401 ? 'INVALID_CREDENTIALS'
    : status === 403 ? 'FORBIDDEN'
    : status === 404 ? 'RESOURCE_NOT_FOUND'
    : status === 409 ? 'INVALID_STATE_TRANSITION'
    : status === 503 ? 'DEPENDENCY_UNAVAILABLE'
    : status >= 500 ? 'INTERNAL_ERROR'
    : 'INVALID_REQUEST';
  return {
    status,
    code,
    message:
      status >= 500
        ? 'Error interno del servidor. El identificador de soporte está disponible.'
        : 'La solicitud no se pudo procesar.',
    requestId,
  };
}

export function createHttpAdapter(deps: HttpAdapterDeps): HttpPort {
  const { session, onSessionEvent } = deps;

  return {
    async request<T>(options: HttpRequestOptions): Promise<T> {
      const {
        method,
        path,
        body,
        query,
        requiresAuth = true,
        signal,
        timeoutMs = DEFAULT_TIMEOUT_MS,
      } = options;

      const requestId = newRequestId();
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Request-Id': requestId,
      };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (requiresAuth) {
        const token = session.getAccessToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }

      const controller = new AbortController();
      const timedOut = { value: false };
      const timer = setTimeout(() => {
        timedOut.value = true;
        controller.abort();
      }, timeoutMs);
      const onExternalAbort = (): void => controller.abort();
      if (signal) {
        if (signal.aborted) controller.abort();
        else signal.addEventListener('abort', onExternalAbort, { once: true });
      }

      let response: Response;
      try {
        response = await fetch(buildUrl(path, query), {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (e) {
        if (timedOut.value) {
          throw new NetworkError('NETWORK_TIMEOUT', 'El servidor tardó demasiado en responder. Inténtalo de nuevo.', requestId);
        }
        if ((e as Error)?.name === 'AbortError') throw e;
        throw new NetworkError('NETWORK_ERROR', 'No se pudo conectar con el banco. Verifica tu conexión.', requestId);
      } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onExternalAbort);
      }

      const text = await response.text();
      let parsed: unknown = undefined;
      if (text.length > 0) {
        try {
          parsed = JSON.parse(text) as unknown;
        } catch {
          parsed = undefined;
        }
      }

      if (response.ok) return parsed as T;

      const headerRequestId = response.headers.get('X-Request-Id') ?? undefined;

      if (response.status === 401 && requiresAuth && session.getAccessToken()) {
        session.clearSession();
        onSessionEvent?.({ type: 'expired' });
        if (isErrorEnvelope(parsed)) {
          throw new BackendError({ ...parsed, requestId: parsed.requestId ?? headerRequestId, sessionExpired: true });
        }
        throw new BackendError({
          status: 401,
          code: 'INVALID_CREDENTIALS',
          message: 'Tu sesión expiró. Vuelve a iniciar sesión.',
          requestId: headerRequestId,
          sessionExpired: true,
        });
      }

      if (isErrorEnvelope(parsed)) {
        throw new BackendError({ ...parsed, requestId: parsed.requestId ?? headerRequestId });
      }
      throw new BackendError(fallbackError(response.status, headerRequestId));
    },
  };
}
