import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Global Exception Handler (SDD/Adapters/Global-exception-handler.md).
 * Capa REST/adapters: traduce excepciones de dominio, infraestructura y runtime
 * a la forma uniforme de error HTTP. El dominio no conoce este archivo.
 */
export interface ErrorResponse {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  path: string;
  requestId: string;
  details: unknown;
}

export interface RequestWithId extends Request {
  requestId: string;
}

interface ErrorMapping {
  status: number;
  code: string;
}

/** Asigna o reutiliza `X-Request-Id` para correlacionar logs y respuestas. */
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const id = Array.isArray(incoming) ? incoming[0] : incoming;
  (req as RequestWithId).requestId = id && id.length > 0 ? id : `req-${randomUUID()}`;
  next();
}

/** Clasificaciones explícitas que no se derivan por regla de nombre. */
const EXPLICIT: Record<string, ErrorMapping> = {
  InvalidCredentialsException: { status: 401, code: 'INVALID_CREDENTIALS' },
  InvalidCredentialsActiveException: { status: 401, code: 'INVALID_CREDENTIALS' },
  SessionNotFoundException: { status: 401, code: 'AUTHENTICATION_REQUIRED' },
  UserNotActiveException: { status: 403, code: 'FORBIDDEN' },
  EntityNotFoundError: { status: 404, code: 'RESOURCE_NOT_FOUND' },
  NotificationDeliveryException: { status: 503, code: 'DEPENDENCY_UNAVAILABLE' },
};

/** Errores de drivers/ORM que significan dependencia no disponible. */
const DEPENDENCY_ERROR_NAMES = new Set([
  'QueryFailedError',
  'MongoServerError',
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoExpiredSessionError',
  'ConnectionError',
  'ConnectionRefusedError',
  'DriverError',
]);
const DEPENDENCY_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH']);

/** `CustomerNotFoundException` -> `CUSTOMER_NOT_FOUND`. */
export function toErrorCode(name: string): string {
  const base = name.replace(/(Exception|Error)$/, '');
  return base.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
}

function statusCodeOverride(status: unknown): number | null {
  return typeof status === 'number' && Number.isInteger(status) && status >= 400 && status < 600
    ? status
    : null;
}

function explicitCode(err: { code?: unknown }): string | null {
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' && /^[A-Z][A-Z0-9_]{2,}$/.test(code) ? code : null;
}

/**
 * Mapeo determinístico excepción -> {status, code}.
 * Los errores desconocidos son 500 (nunca 400) según el contrato.
 */
export function classifyError(err: unknown): ErrorMapping {
  const e = (err ?? {}) as Record<string, unknown>;
  const name = typeof (err as Error)?.name === 'string' ? (err as Error).name : 'Error';

  const statusFromProp = statusCodeOverride(e['status']);
  if (statusFromProp !== null) {
    const message = String((err as Error)?.message ?? '');
    if (statusFromProp === 401) {
      return { status: 401, code: explicitCode(e) ?? (/missing|required/i.test(message) ? 'AUTHENTICATION_REQUIRED' : 'INVALID_CREDENTIALS') };
    }
    if (statusFromProp === 403) return { status: 403, code: explicitCode(e) ?? 'FORBIDDEN' };
    if (statusFromProp === 404) return { status: 404, code: explicitCode(e) ?? 'RESOURCE_NOT_FOUND' };
    if (statusFromProp === 409) return { status: 409, code: explicitCode(e) ?? 'RESOURCE_ALREADY_EXISTS' };
    if (statusFromProp === 400) return { status: 400, code: explicitCode(e) ?? 'INVALID_REQUEST' };
    if (statusFromProp === 503) return { status: 503, code: explicitCode(e) ?? 'DEPENDENCY_UNAVAILABLE' };
    return { status: statusFromProp, code: explicitCode(e) ?? 'INTERNAL_ERROR' };
  }

  // JSON malformado de body-parser: SyntaxError con status 400.
  if (err instanceof SyntaxError && statusCodeOverride((e as { status?: unknown }).status) === 400) {
    return { status: 400, code: 'INVALID_REQUEST' };
  }

  if (EXPLICIT[name] !== undefined) return EXPLICIT[name];
  if (DEPENDENCY_ERROR_NAMES.has(name)) return { status: 503, code: 'DEPENDENCY_UNAVAILABLE' };
  if (typeof e['code'] === 'string' && DEPENDENCY_CODES.has(e['code'] as string)) {
    return { status: 503, code: 'DEPENDENCY_UNAVAILABLE' };
  }
  if (/NotFound(Exception|Error)$/.test(name)) return { status: 404, code: explicitCode(e) ?? toErrorCode(name) };
  if (/AlreadyExists(Exception)$/.test(name)) return { status: 409, code: explicitCode(e) ?? toErrorCode(name) };
  if (/^Unauthorized/.test(name)) return { status: 403, code: explicitCode(e) ?? 'FORBIDDEN' };
  if (/Already|Transition|NotApproved|NotEligible|Disbursement|Insufficient/.test(name)) {
    return { status: 409, code: explicitCode(e) ?? toErrorCode(name) };
  }
  if (/^Invalid/.test(name) || /SameAccount|InvalidDestination|InvalidAffectedProduct/.test(name)) {
    return { status: 400, code: explicitCode(e) ?? toErrorCode(name) };
  }
  if (/Exception$/.test(name)) return { status: 400, code: explicitCode(e) ?? toErrorCode(name) };
  return { status: 500, code: 'INTERNAL_ERROR' };
}

function safeMessage(err: unknown, status: number): string {
  if (status === 500) return 'Internal server error';
  const message = (err as Error)?.message;
  return typeof message === 'string' && message.length > 0 ? message : 'Unexpected error';
}

function requestIdOf(req: Request): string {
  return (req as RequestWithId).requestId || 'req-unknown';
}

/**
 * Middleware global de errores Express (4 args). Registrar después de todas
 * las rutas. Respeta `headersSent` y nunca envía dos respuestas.
 */
export function globalErrorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  const { status, code } = classifyError(err);
  const requestId = requestIdOf(req);
  if (status >= 500) {
    // Solo en el servidor: jamás en la respuesta.
    console.error(`[${requestId}] ${req.method} ${req.path} -> ${status} ${code}:`, err);
  }
  const details = (err as { details?: unknown })?.details ?? null;
  const body: ErrorResponse = {
    timestamp: new Date().toISOString(),
    status,
    code,
    message: safeMessage(err, status),
    path: req.path,
    requestId,
    details,
  };
  res.status(status).json(body);
}
