/**
 * Smoke live por rol (F7): recorre login → dashboard → mutación → logout
 * contra el backend real, validando cada respuesta con los mappers del
 * frontend (contrato F3 contra DTOs reales, no mocks).
 *
 * Ejecutar: `npm run test:live` (requiere backend + empleados seed).
 * Todo lo creado usa sufijo único; nunca toca datos ajenos.
 */
import { describe, expect, it } from 'vitest';
import {
  mapAccount,
  mapAuditLog,
  mapBalance,
  mapCustomer,
  mapHealth,
  mapLoan,
  mapLoginResponse,
  mapOperation,
  mapTransfer,
  mapUser,
} from '../../src/adapters/mappers/responseMappers';

const BASE = process.env.LIVE_BASE_URL ?? 'http://localhost:8080';
const S = Date.now().toString(36);
const PASSWORD = 'Secret123!';

interface ApiOpts {
  token?: string;
  body?: unknown;
  expect: number;
}

async function api(name: string, method: string, path: string, opts: ApiOpts): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  const json = (text ? JSON.parse(text) : null) as unknown;
  expect({ step: name, status: res.status, body: text.slice(0, 300) }).toMatchObject({ step: name, status: opts.expect });
  return json;
}

async function login(username: string): Promise<string> {
  const raw = await api(`login ${username}`, 'POST', '/api/v1/auth/login', {
    body: { username, password: PASSWORD },
    expect: 200,
  });
  const session = mapLoginResponse(raw);
  expect(session.tokenType).toBe('Bearer');
  return session.token;
}

describe('live smoke por rol', () => {
  it('flujo completo 7 roles', async () => {
    // Health (SystemService.health).
    expect(mapHealth(await api('health', 'GET', '/health', { expect: 200 })).status).toBe('UP');

    // Público: clientes + usuarios con sufijo único.
    const natA = `live-nat-a-${S}`;
    const natB = `live-nat-b-${S}`;
    const bizC = `live-biz-${S}`;
    await api('register natural A', 'POST', '/api/v1/auth/register/natural-customer', {
      body: { identification: natA, name: 'Live A', email: `livea.${S}@bank.com`, phoneNumber: '3000000002', address: 'Live 2', birthDate: '1992-02-02' },
      expect: 201,
    });
    await api('register natural B', 'POST', '/api/v1/auth/register/natural-customer', {
      body: { identification: natB, name: 'Live B', email: `liveb.${S}@bank.com`, phoneNumber: '3000000003', address: 'Live 3', birthDate: '1993-03-03' },
      expect: 201,
    });
    const bizRaw = await api('register business C', 'POST', '/api/v1/auth/register/business-customer', {
      body: { identification: bizC, name: 'Live Corp', email: `livec.${S}@bank.com`, phoneNumber: '6040000000', address: 'Live Corp', legalRepresentativeIdentification: natA },
      expect: 201,
    });
    expect(mapCustomer(bizRaw).customerType).toBe('BUSINESS');
    const userA = `liveusera${S}`;
    const userC = `liveuserc${S}`;
    expect(mapUser(await api('register user A', 'POST', '/api/v1/auth/register/user', {
      body: { customerIdentification: natA, username: userA, password: PASSWORD, role: 'NATURAL_CUSTOMER' },
      expect: 201,
    })).role).toBe('NATURAL_CUSTOMER');
    await api('register user C', 'POST', '/api/v1/auth/register/user', {
      body: { customerIdentification: bizC, username: userC, password: PASSWORD, role: 'BUSINESS_CUSTOMER' },
      expect: 201,
    });

    // Login 7 roles.
    const tokA = await login(userA);
    const tokC = await login(userC);
    const tokTeller = await login('seed-teller');
    const tokOperatorSeed = await login('seed-operator');
    expect(tokOperatorSeed.length).toBeGreaterThan(0);
    const tokSupervisor = await login('seed-supervisor');
    const tokCommercial = await login('seed-commercial');
    const tokAnalyst = await login('seed-analyst');

    // Teller: apertura, fondeo, consulta, bloqueo/desbloqueo.
    const accA1 = `LIVE-A1-${S}`;
    const accB1 = `LIVE-B1-${S}`;
    const accC1 = `LIVE-C1-${S}`;
    for (const [n, owner] of [[accA1, natA], [accB1, natB], [accC1, bizC]] as Array<[string, string]>) {
      const opened = mapAccount(await api(`teller open ${n}`, 'POST', '/api/v1/teller/accounts', {
        token: tokTeller,
        body: { accountNumber: n, accountType: 'SAVINGS', currency: 'COP', ownerIdentification: owner },
        // Observación de contrato: Api-rest-endpoints.md §8.5 documenta 201,
        // el backend responde 200 (su propio seed espera 200). El frontend
        // acepta cualquier 2xx; se fija el comportamiento real aquí.
        expect: 200,
      }));
      expect(opened.accountNumber).toBe(n);
    }
    expect(mapBalance(await api('deposit A1', 'POST', `/api/v1/teller/accounts/${accA1}/deposits`, {
      token: tokTeller, body: { amount: 20000, reference: `live ${S}` }, expect: 200,
    })).availableBalance).toBe(20000);
    await api('deposit B1', 'POST', `/api/v1/teller/accounts/${accB1}/deposits`, {
      token: tokTeller, body: { amount: 5000 }, expect: 200,
    });
    await api('deposit C1', 'POST', `/api/v1/teller/accounts/${accC1}/deposits`, {
      token: tokTeller, body: { amount: 90000000 }, expect: 200,
    });
    expect(mapBalance(await api('withdraw B1', 'POST', `/api/v1/teller/accounts/${accB1}/withdrawals`, {
      token: tokTeller, body: { amount: 1000 }, expect: 200,
    })).availableBalance).toBe(4000);
    expect(mapAccount(await api('block B1', 'PATCH', `/api/v1/teller/accounts/${accB1}/block`, {
      token: tokTeller, expect: 200,
    })).status).toBe('BLOCKED');
    expect(mapAccount(await api('unblock B1', 'PATCH', `/api/v1/teller/accounts/${accB1}/unblock`, {
      token: tokTeller, expect: 200,
    })).status).toBe('ACTIVE');
    expect(mapCustomer(await api('teller search A', 'GET', `/api/v1/teller/customers?identification=${natA}`, {
      token: tokTeller, expect: 200,
    })).identification).toBe(natA);

    // Natural: dashboard (perfil, cuentas, balance) + préstamo + transferencia + operaciones.
    expect(mapCustomer(await api('natural profile', 'GET', '/api/v1/natural-customer/profile', {
      token: tokA, expect: 200,
    })).identification).toBe(natA);
    const myAccounts = (await api('natural accounts', 'GET', '/api/v1/natural-customer/accounts', {
      token: tokA, expect: 200,
    }) as unknown[]).map(mapAccount);
    expect(myAccounts.length).toBeGreaterThanOrEqual(1);
    expect(mapBalance(await api('natural balance', 'GET', `/api/v1/natural-customer/accounts/${accA1}/balance`, {
      token: tokA, expect: 200,
    })).availableBalance).toBe(20000);
    const loan1 = mapLoan(await api('natural request loan', 'POST', '/api/v1/natural-customer/loans', {
      token: tokA,
      body: { loanType: 'PERSONAL', requestedAmount: 5000000, termInMonths: 24, destinationAccountNumber: accA1 },
      expect: 201,
    }));
    expect(loan1.status).toBe('UNDER_REVIEW');
    expect(mapTransfer(await api('natural transfer', 'POST', '/api/v1/natural-customer/transfers', {
      token: tokA,
      body: { sourceAccountNumber: accA1, destinationAccountNumber: accB1, amount: 1500, description: `live ${S}` },
      expect: 201,
    })).status).toBe('EXECUTED');
    const ops = (await api('natural operations', 'GET', `/api/v1/natural-customer/operations?accountNumber=${accA1}`, {
      token: tokA, expect: 200,
    }) as unknown[]).map(mapOperation);
    expect(ops.length).toBeGreaterThanOrEqual(1);

    // Empresa + operador + supervisor: ciclo de aprobación.
    expect(mapCustomer(await api('company profile', 'GET', '/api/v1/business-customer/profile', {
      token: tokC, expect: 200,
    })).identification).toBe(bizC);
    const userOp = `liveop${S}`;
    await api('register operator', 'POST', '/api/v1/business-customer/users', {
      token: tokC,
      body: { username: userOp, password: PASSWORD, role: 'BUSINESS_OPERATOR', email: `liveop.${S}@bank.com`, identification: `live-op-${S}`, name: 'Live Op' },
      expect: 201,
    });
    const tokOp = await login(userOp);
    const companyAccounts = (await api('operator accounts', 'GET', '/api/v1/business-operator/accounts', {
      token: tokOp, expect: 200,
    }) as unknown[]).map(mapAccount);
    expect(companyAccounts.length).toBeGreaterThanOrEqual(1);
    const mkBizTransfer = async (tag: string, amount: number): Promise<string> => {
      const t = mapTransfer(await api(tag, 'POST', '/api/v1/business-operator/transfers', {
        token: tokOp,
        body: { sourceAccountNumber: accC1, destinationAccountNumber: accA1, amount, description: `live ${S}` },
        expect: 202,
      }));
      expect(t.status).toBe('WAITING_FOR_APPROVAL');
      return t.transferId;
    };
    const t1 = await mkBizTransfer('operator transfer T1', 50000000);
    const t2 = await mkBizTransfer('operator transfer T2', 30000000);
    const t3 = await mkBizTransfer('operator transfer T3', 20000000);
    const t4 = await mkBizTransfer('operator transfer T4', 15000000);
    expect(mapTransfer(await api('business approve T1', 'PATCH', `/api/v1/business-customer/transfers/${t1}/approve`, {
      token: tokC, expect: 200,
    })).status).toBe('APPROVED');
    expect(mapTransfer(await api('business reject T2', 'PATCH', `/api/v1/business-customer/transfers/${t2}/reject`, {
      token: tokC, body: { rejectionReason: 'Excede presupuesto semanal' }, expect: 200,
    })).status).toBe('REJECTED');
    const pending = (await api('supervisor pending', 'GET', '/api/v1/business-supervisor/transfers/pending', {
      token: tokSupervisor, expect: 200,
    }) as unknown[]).map(mapTransfer);
    expect(pending.some((t) => t.transferId === t3)).toBe(true);
    expect(mapTransfer(await api('supervisor approve T3', 'PATCH', `/api/v1/business-supervisor/transfers/${t3}/approve`, {
      token: tokSupervisor, expect: 200,
    })).status).toBe('APPROVED');
    // Fija la corrección del frontend: el supervisor rechaza SIN cuerpo (§7.3).
    expect(mapTransfer(await api('supervisor reject T4 sin cuerpo', 'PATCH', `/api/v1/business-supervisor/transfers/${t4}/reject`, {
      token: tokSupervisor, expect: 200,
    })).status).toBe('REJECTED');

    // Comercial: préstamo por cuenta del cliente.
    expect(mapLoan(await api('commercial loan', 'POST', '/api/v1/commercial/loans', {
      token: tokCommercial,
      body: { customerIdentification: natA, loanType: 'PERSONAL', requestedAmount: 1000000, termInMonths: 12, destinationAccountNumber: accA1 },
      expect: 201,
    })).status).toBe('UNDER_REVIEW');

    // Analista: empleado, estado cliente, ciclo préstamo, auditoría.
    const empUser = `liveemp${S}`;
    await api('analyst register employee', 'POST', '/api/v1/internal-analyst/users/employee', {
      token: tokAnalyst,
      body: { username: empUser, password: PASSWORD, role: 'TELLER_EMPLOYEE', email: `liveemp.${S}@bank.com`, identification: `live-emp-${S}`, name: 'Live Emp' },
      expect: 201,
    });
    expect(mapCustomer(await api('analyst block B', 'PATCH', `/api/v1/internal-analyst/customers/${natB}/status`, {
      token: tokAnalyst, body: { status: 'BLOCKED', reason: `live ${S}` }, expect: 200,
    })).status).toBe('BLOCKED');
    expect(mapCustomer(await api('analyst activate B', 'PATCH', `/api/v1/internal-analyst/customers/${natB}/status`, {
      token: tokAnalyst, body: { status: 'ACTIVE', reason: `live ${S}` }, expect: 200,
    })).status).toBe('ACTIVE');
    expect(mapLoan(await api('analyst approve L1', 'PATCH', `/api/v1/internal-analyst/loans/${loan1.loanId}/approve`, {
      token: tokAnalyst, body: { approvedAmount: 5000000, interestRate: 1.45 }, expect: 200,
    })).status).toBe('APPROVED');
    expect(mapLoan(await api('analyst disburse L1', 'POST', `/api/v1/internal-analyst/loans/${loan1.loanId}/disburse`, {
      token: tokAnalyst, expect: 200,
    })).status).toBe('DISBURSED');
    await api('natural loan payment', 'POST', `/api/v1/natural-customer/loans/${loan1.loanId}/payments`, {
      token: tokA, body: { sourceAccountNumber: accA1, amount: 250000 }, expect: 200,
    });
    const audit = await api('analyst audit-logs', 'GET', '/api/v1/internal-analyst/audit-logs?page=0&size=5', {
      token: tokAnalyst, expect: 200,
    }) as { content: unknown[]; totalElements: number; totalPages: number };
    expect(audit.totalElements).toBeGreaterThanOrEqual(1);
    expect(audit.content.map(mapAuditLog).length).toBeGreaterThanOrEqual(1);

    // Aislamiento de roles: rol equivocado -> 403 con envoltorio estándar.
    const forbidden = async (tag: string, token: string, path: string): Promise<void> => {
      const raw = (await api(tag, 'GET', path, { token, expect: 403 })) as { code: string; requestId?: string };
      expect(raw.code).toBe('FORBIDDEN');
    };
    await forbidden('natural no toca teller', tokA, `/api/v1/teller/customers?identification=${natA}`);
    await forbidden('teller no toca perfil natural', tokTeller, '/api/v1/natural-customer/profile');
    await forbidden('commercial no toca pendientes', tokCommercial, '/api/v1/business-supervisor/transfers/pending');

    // Logout cierra la sesión.
    await api('logout A', 'POST', '/api/v1/auth/logout', { token: tokA, expect: 204 });
  });
});
