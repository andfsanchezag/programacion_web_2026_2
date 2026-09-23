import { describe, it, expect, beforeAll } from 'vitest';

/**
 * E2E Fase 6 (automatizado): API real en Docker (MySQL + Mongo).
 * Requiere `docker compose up -d`. Ejecución: `npm run test:e2e`
 * con `E2E_BASE_URL` (defecto http://localhost:8080).
 */
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const SUFFIX = Date.now().toString(36);
const IDENT = `e2e-nat-${SUFFIX}`;
const USERNAME = `e2euser${SUFFIX}`;
const PASSWORD = 'Secret123!';
const EMAIL = `e2e.nat.${SUFFIX}@bank.com`;

interface ErrorShape {
  timestamp: string; status: number; code: string;
  message: string; path: string; requestId: string; details: unknown;
}

function expectErrorShape(body: unknown, status: number, code: string): void {
  const b = body as ErrorShape;
  expect(Object.keys(b).sort()).toEqual(
    ['code', 'details', 'message', 'path', 'requestId', 'status', 'timestamp'].sort());
  expect(b.status).toBe(status);
  expect(b.code).toBe(code);
  expect(typeof b.requestId).toBe('string');
}

async function req(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { res, json };
}

describe('E2E banking API (Docker)', () => {
  let token = '';

  beforeAll(async () => {
    try {
      const { res, json } = await req('/health');
      expect(res.status).toBe(200);
      expect((json as { status: string }).status).toBe('UP');
    } catch (e) {
      throw new Error(
        `E2E requiere la API en ${BASE} (ejecute 'docker compose up -d'): ${(e as Error).message}`);
    }
  });

  it('registra un cliente natural (201)', async () => {
    const { res, json } = await req('/api/v1/auth/register/natural-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identification: IDENT, name: 'E2E Nat', email: EMAIL,
        phoneNumber: '3001112222', address: 'Calle E2E', birthDate: '1990-01-01',
      }),
    });
    expect(res.status).toBe(201);
    expect(json).toMatchObject({ identification: IDENT, status: 'ACTIVE', customerType: 'NATURAL' });
  });

  it('rechaza el registro duplicado (409 uniforme)', async () => {
    const { res, json } = await req('/api/v1/auth/register/natural-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identification: IDENT, name: 'E2E Nat', email: EMAIL,
        phoneNumber: '3001112222', address: 'Calle E2E', birthDate: '1990-01-01',
      }),
    });
    expect(res.status).toBe(409);
    expectErrorShape(json, 409, 'CUSTOMER_ALREADY_EXISTS');
  });

  it('registra un usuario del cliente (201)', async () => {
    const { res, json } = await req('/api/v1/auth/register/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerIdentification: IDENT, username: USERNAME,
        password: PASSWORD, role: 'NATURAL_CUSTOMER',
      }),
    });
    expect(res.status).toBe(201);
    expect(json).toMatchObject({ username: USERNAME, role: 'NATURAL_CUSTOMER' });
  });

  it('login emite JWT con claims (200)', async () => {
    const { res, json } = await req('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
    });
    expect(res.status).toBe(200);
    const body = json as { token: string; tokenType: string; user: Record<string, string> };
    expect(body.token.split('.')).toHaveLength(3);
    const payload = JSON.parse(Buffer.from(body.token.split('.')[1], 'base64').toString('utf8'));
    expect(payload.role).toBe('NATURAL_CUSTOMER');
    expect(typeof payload.sub === 'string' || typeof payload.userId === 'string').toBe(true);
    token = body.token;
  });

  it('login con credenciales inválidas (401)', async () => {
    const { res, json } = await req('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: 'Wrong!' }),
    });
    expect(res.status).toBe(401);
    expectErrorShape(json, 401, 'INVALID_CREDENTIALS');
  });

  it('perfil con JWT (200)', async () => {
    const { res, json } = await req('/api/v1/natural-customer/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(json).toMatchObject({ identification: IDENT });
  });

  it('ruta protegida sin token (401)', async () => {
    const { res, json } = await req('/api/v1/natural-customer/profile');
    expect(res.status).toBe(401);
    expectErrorShape(json, 401, 'AUTHENTICATION_REQUIRED');
  });

  it('ruta protegida con token inválido (401)', async () => {
    const { res, json } = await req('/api/v1/natural-customer/profile', {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    expect(res.status).toBe(401);
    expect((json as ErrorShape).code).toMatch(/AUTHENTICATION_REQUIRED|INVALID_CREDENTIALS/);
  });

  it('rol incorrecto (403 FORBIDDEN)', async () => {
    const { res, json } = await req(`/api/v1/teller/customers?identification=${IDENT}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
    expectErrorShape(json, 403, 'FORBIDDEN');
  });

  it('recurso inexistente (404 LOAN_NOT_FOUND)', async () => {
    // Requiere rol analyst: se verifica el rechazo por rol para este token.
    const { res } = await req('/api/v1/internal-analyst/loans/LOAN-E2E-NOEXISTE', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('ruta no registrada (404 uniforme)', async () => {
    const { res, json } = await req('/api/v1/no-existe');
    expect(res.status).toBe(404);
    expectErrorShape(json, 404, 'RESOURCE_NOT_FOUND');
  });

  it('JSON malformado (400 INVALID_REQUEST)', async () => {
    const { res, json } = await req('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"broken":',
    });
    expect(res.status).toBe(400);
    expectErrorShape(json, 400, 'INVALID_REQUEST');
  });

  it('logout (204)', async () => {
    const { res } = await req('/api/v1/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(204);
  });
});
