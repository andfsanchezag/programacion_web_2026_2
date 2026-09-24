/**
 * HTTP adapter (F2/F7): propagación JWT, X-Request-Id, manejo 401/403,
 * mapeo del envoltorio de error estándar y timeout.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createHttpAdapter } from './httpAdapter';
import { BackendError, NetworkError } from '../../domain/errors';
import type { SessionPort } from '../../domain/ports';
import type { Session } from '../../domain/models';

const sessionData: Session = {
  token: 'jwt-token-abc',
  tokenType: 'Bearer',
  expiresIn: 3600,
  expiresAt: Date.now() + 3600_000,
  user: { userId: 'u1', username: 'ana', email: 'ana@example.com', role: 'NATURAL_CUSTOMER' },
};

function fakeSession(token: string | null): SessionPort & { cleared: boolean } {
  const port = {
    cleared: false,
    saveSession: vi.fn(),
    readSession: vi.fn(() => (token ? sessionData : null)),
    getAccessToken: vi.fn(() => token),
    clearSession: vi.fn(() => {
      port.cleared = true;
    }),
    isExpired: vi.fn(() => token === null),
  };
  return port;
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('httpAdapter', () => {
  it('envía Authorization Bearer + JSON + X-Request-Id en peticiones protegidas', async () => {
    let seenHeaders: Record<string, string> = {};
    const fetchMock = vi.fn(async (_url: unknown, init?: { headers?: Record<string, string> }) => {
      seenHeaders = init?.headers ?? {};
      return jsonResponse({ ok: true }, 200);
    });
    vi.stubGlobal('fetch', fetchMock);
    const http = createHttpAdapter({ session: fakeSession('jwt-token-abc') });

    await http.request({ method: 'GET', path: '/api/v1/natural-customer/profile' });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(seenHeaders['Authorization']).toBe('Bearer jwt-token-abc');
    expect(seenHeaders['Accept']).toBe('application/json');
    expect(seenHeaders['X-Request-Id']).toMatch(/^req-/);
  });

  it('omite Authorization en peticiones públicas (login/registro)', async () => {
    let seenHeaders: Record<string, string> = {};
    const fetchMock = vi.fn(async (_url: unknown, init?: { headers?: Record<string, string> }) => {
      seenHeaders = init?.headers ?? {};
      return jsonResponse({ ok: true }, 200);
    });
    vi.stubGlobal('fetch', fetchMock);
    const http = createHttpAdapter({ session: fakeSession('jwt-token-abc') });

    await http.request({ method: 'POST', path: '/api/v1/auth/login', body: { u: 1 }, requiresAuth: false });

    expect(seenHeaders['Authorization']).toBeUndefined();
  });

  it('en 401 protegida limpia la sesión, notifica expiración y marca sessionExpired', async () => {
    const envelope = { status: 401, code: 'INVALID_CREDENTIALS', message: 'expired', requestId: 'req-1' };
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(envelope, 401)));
    const session = fakeSession('jwt-token-abc');
    const onSessionEvent = vi.fn();
    const http = createHttpAdapter({ session, onSessionEvent });

    const err = await http.request({ method: 'GET', path: '/api/v1/natural-customer/accounts' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(BackendError);
    expect((err as BackendError).sessionExpired).toBe(true);
    expect(session.clearSession).toHaveBeenCalled();
    expect(onSessionEvent).toHaveBeenCalledWith({ type: 'expired' });
  });

  it('en 403 conserva la sesión (la alerta la presenta el caller)', async () => {
    const envelope = { status: 403, code: 'FORBIDDEN', message: 'denied' };
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(envelope, 403)));
    const session = fakeSession('jwt-token-abc');
    const onSessionEvent = vi.fn();
    const http = createHttpAdapter({ session, onSessionEvent });

    const err = await http.request({ method: 'GET', path: '/api/v1/teller/customers' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(BackendError);
    expect((err as BackendError).code).toBe('FORBIDDEN');
    expect(session.clearSession).not.toHaveBeenCalled();
    expect(onSessionEvent).not.toHaveBeenCalled();
  });

  it('preserva código estable y requestId del envoltorio backend', async () => {
    const envelope = { status: 409, code: 'INSUFFICIENT_BALANCE', message: 'sin fondos', requestId: 'req-77' };
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(envelope, 409)));
    const http = createHttpAdapter({ session: fakeSession('t') });

    const err = (await http
      .request({ method: 'POST', path: '/api/v1/natural-customer/transfers', body: {} })
      .catch((e: unknown) => e)) as BackendError;

    expect(err.code).toBe('INSUFFICIENT_BALANCE');
    expect(err.requestId).toBe('req-77');
  });

  it('un timeout produce NetworkError NETWORK_TIMEOUT sin colgar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        await new Promise<void>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          });
        });
        throw new Error('unreachable');
      }),
    );
    const http = createHttpAdapter({ session: fakeSession('t') });

    const err = (await http
      .request({ method: 'GET', path: '/health', timeoutMs: 20 })
      .catch((e: unknown) => e)) as NetworkError;

    expect(err).toBeInstanceOf(NetworkError);
    expect(err.code).toBe('NETWORK_TIMEOUT');
  });
});
