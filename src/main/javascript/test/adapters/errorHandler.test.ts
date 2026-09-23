import { describe, it, expect, vi, afterAll } from 'vitest';
import express, { Request, Response } from 'express';
import { AddressInfo } from 'node:net';
import {
  classifyError,
  toErrorCode,
  requestIdMiddleware,
  globalErrorHandler,
  ErrorResponse,
} from '../../application/adapters/rest/middleware/errorHandler';
import { CustomerNotFoundException } from '../../application/domain/exceptions/customer-errors';
import { InvalidTransferException } from '../../application/domain/exceptions/transfer-errors';
import { TransferAlreadyApprovedException } from '../../application/domain/exceptions/transfer-errors';
import { UnauthorizedApprovalException } from '../../application/domain/exceptions/authorization-errors';
import { InvalidCredentialsException } from '../../application/domain/exceptions/user-errors';
import { UserAlreadyExistsException } from '../../application/domain/exceptions/user-errors';

describe('Global Exception Handler: clasificación determinística', () => {
  it('404 para *NotFound con código estable derivado', () => {
    expect(classifyError(new CustomerNotFoundException('Customer not found')))
      .toEqual({ status: 404, code: 'CUSTOMER_NOT_FOUND' });
  });

  it('400 para Invalid* con código derivado', () => {
    expect(classifyError(new InvalidTransferException('Transfer amount must be positive')))
      .toEqual({ status: 400, code: 'INVALID_TRANSFER' });
  });

  it('409 para Already*/transiciones de estado', () => {
    expect(classifyError(new TransferAlreadyApprovedException('already approved')))
      .toEqual({ status: 409, code: 'TRANSFER_ALREADY_APPROVED' });
  });

  it('403 para Unauthorized* con código FORBIDDEN', () => {
    expect(classifyError(new UnauthorizedApprovalException('not authorized')))
      .toEqual({ status: 403, code: 'FORBIDDEN' });
  });

  it('401 para credenciales inválidas', () => {
    expect(classifyError(new InvalidCredentialsException('bad credentials')))
      .toEqual({ status: 401, code: 'INVALID_CREDENTIALS' });
  });

  it('409 para duplicados', () => {
    expect(classifyError(new UserAlreadyExistsException('dup')))
      .toEqual({ status: 409, code: 'USER_ALREADY_EXISTS' });
  });

  it('respeta status numérico existente (401 ausente / 403 rol)', () => {
    expect(classifyError(Object.assign(new Error('Missing bearer token'), { status: 401 })))
      .toEqual({ status: 401, code: 'AUTHENTICATION_REQUIRED' });
    expect(classifyError(Object.assign(new Error('Invalid or expired token'), { status: 401 })))
      .toEqual({ status: 401, code: 'INVALID_CREDENTIALS' });
    expect(classifyError(Object.assign(new Error('Forbidden for role X'), { status: 403 })))
      .toEqual({ status: 403, code: 'FORBIDDEN' });
  });

  it('503 para fallos de dependencias (ORM/drivers)', () => {
    const q = new Error('Connection refused'); q.name = 'QueryFailedError';
    expect(classifyError(q)).toEqual({ status: 503, code: 'DEPENDENCY_UNAVAILABLE' });
    const m = new Error('timeout'); m.name = 'MongoNetworkTimeoutError';
    expect(classifyError(m)).toEqual({ status: 503, code: 'DEPENDENCY_UNAVAILABLE' });
    const refused = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    expect(classifyError(refused)).toEqual({ status: 503, code: 'DEPENDENCY_UNAVAILABLE' });
  });

  it('500 para errores desconocidos (nunca 400 por defecto)', () => {
    expect(classifyError(new Error('boom'))).toEqual({ status: 500, code: 'INTERNAL_ERROR' });
    expect(classifyError(new TypeError('x is not a function'))).toEqual({ status: 500, code: 'INTERNAL_ERROR' });
    expect(classifyError(null)).toEqual({ status: 500, code: 'INTERNAL_ERROR' });
    expect(classifyError('string failure')).toEqual({ status: 500, code: 'INTERNAL_ERROR' });
  });

  it('503 con status numérico y SyntaxError sin status van a su categoría', () => {
    expect(classifyError(Object.assign(new Error('down'), { status: 503 })))
      .toEqual({ status: 503, code: 'DEPENDENCY_UNAVAILABLE' });
    expect(classifyError(new SyntaxError('Unexpected token'))).toEqual({ status: 400, code: 'INVALID_REQUEST' });
  });

  it('409 para violaciones de estado (StatusException)', async () => {
    const { InvalidLoanStatusException } = await import('../../application/domain/exceptions/loan-errors');
    expect(classifyError(new InvalidLoanStatusException('bad status')))
      .toEqual({ status: 409, code: 'INVALID_LOAN_STATUS' });
  });

  it('toErrorCode deriva SNAKE_CASE estable', () => {
    expect(toErrorCode('CustomerNotFoundException')).toBe('CUSTOMER_NOT_FOUND');
    expect(toErrorCode('InvalidTransferStatusTransitionException')).toBe('INVALID_TRANSFER_STATUS_TRANSITION');
  });
});

describe('Global Exception Handler: requestId y respuesta', () => {
  function mockRes() {
    return {
      headersSent: false,
      statusCode: 0,
      body: null as unknown,
      status(code: number) { this.statusCode = code; return this; },
      json(payload: unknown) { this.body = payload; return this; },
    };
  }

  it('genera requestId cuando falta y reutiliza X-Request-Id', () => {
    const next = vi.fn();
    const req1 = { headers: {} } as unknown as Request;
    requestIdMiddleware(req1, {} as Response, next);
    expect((req1 as unknown as { requestId: string }).requestId).toMatch(/^req-/);
    const req2 = { headers: { 'x-request-id': 'req-fixed-1' } } as unknown as Request;
    requestIdMiddleware(req2, {} as Response, next);
    expect((req2 as unknown as { requestId: string }).requestId).toBe('req-fixed-1');
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('devuelve la forma uniforme con requestId correlacionado', () => {
    const res = mockRes();
    const req = { path: '/api/v1/x', method: 'GET', headers: {}, requestId: 'req-abc' } as unknown as Request;
    globalErrorHandler(new CustomerNotFoundException('Customer not found'), req, res as unknown as Response, vi.fn());
    expect(res.statusCode).toBe(404);
    const body = res.body as ErrorResponse;
    expect(Object.keys(body).sort()).toEqual(['code', 'details', 'message', 'path', 'requestId', 'status', 'timestamp'].sort());
    expect(body).toMatchObject({ status: 404, code: 'CUSTOMER_NOT_FOUND', path: '/api/v1/x', requestId: 'req-abc', details: null });
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it('500 con mensaje genérico sin filtrar detalles internos', () => {
    const res = mockRes();
    const req = { path: '/api/v1/x', method: 'GET', headers: {}, requestId: 'req-500' } as unknown as Request;
    const secret = new Error("secret: password='hunter2'; SELECT * FROM users");
    globalErrorHandler(secret, req, res as unknown as Response, vi.fn());
    expect(res.statusCode).toBe(500);
    const body = res.body as ErrorResponse;
    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('hunter2');
    expect(JSON.stringify(body)).not.toContain('SELECT');
  });

  it('delega a next sin responder cuando headers ya fueron enviados', () => {
    const res = mockRes();
    res.headersSent = true;
    const next = vi.fn();
    const req = { path: '/x', method: 'GET', headers: {} } as unknown as Request;
    const err = new Error('late');
    globalErrorHandler(err, req, res as unknown as Response, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.body).toBeNull();
  });
});

describe('Global Exception Handler: integración HTTP real', () => {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.get('/boom-404', (req, res, next) => next(new CustomerNotFoundException('Customer not found')));
  app.get('/boom-400', (req, res, next) => next(new InvalidTransferException('bad amount')));
  app.get('/boom-409', (req, res, next) => next(new TransferAlreadyApprovedException('already')));
  app.get('/boom-401', (req, res, next) => next(Object.assign(new Error('Missing bearer token'), { status: 401 })));
  app.get('/boom-403', (req, res, next) => next(new UnauthorizedApprovalException('nope')));
  app.get('/boom-503', (req, res, next) => {
    const e = new Error('db down'); e.name = 'QueryFailedError'; next(e);
  });
  app.get('/boom-500', (req, res, next) => next(new Error('unexpected kaboom')));
  app.post('/echo', (req, res) => res.json({ ok: true }));
  app.use(globalErrorHandler);

  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  const base = `http://localhost:${port}`;
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it.each([
    ['/boom-404', 404, 'CUSTOMER_NOT_FOUND'],
    ['/boom-400', 400, 'INVALID_TRANSFER'],
    ['/boom-409', 409, 'TRANSFER_ALREADY_APPROVED'],
    ['/boom-401', 401, 'AUTHENTICATION_REQUIRED'],
    ['/boom-403', 403, 'FORBIDDEN'],
    ['/boom-503', 503, 'DEPENDENCY_UNAVAILABLE'],
    ['/boom-500', 500, 'INTERNAL_ERROR'],
  ])('%s -> %i %s con forma uniforme', async (path, status, code) => {
    const res = await fetch(`${base}${path}`);
    expect(res.status).toBe(status);
    const body = (await res.json()) as ErrorResponse;
    expect(body).toMatchObject({ status, code, path, details: null });
    expect(typeof body.requestId).toBe('string');
    expect(body.requestId.length).toBeGreaterThan(0);
    if (status === 500) expect(body.message).toBe('Internal server error');
  });

  it('propaga X-Request-Id del cliente a la respuesta de error', async () => {
    const res = await fetch(`${base}/boom-404`, { headers: { 'X-Request-Id': 'req-client-9' } });
    const body = (await res.json()) as ErrorResponse;
    expect(body.requestId).toBe('req-client-9');
  });

  it('JSON malformado -> 400 INVALID_REQUEST', async () => {
    const res = await fetch(`${base}/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"broken":',
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as ErrorResponse).code).toBe('INVALID_REQUEST');
  });
});
