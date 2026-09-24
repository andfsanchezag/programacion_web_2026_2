/* eslint-disable no-console */
/**
 * Poblamiento de datos end-to-end (Fase 6): recorre TODOS los endpoints del
 * contrato SDD/Adapters/Api-rest-endpoints.md validando método, código HTTP y
 * forma de respuesta. Idempotente por sufijo único de corrida.
 *
 * Requiere `docker compose up -d`. Uso:
 *   cd src/main/javascript && npx tsx scripts/seed-data.ts
 *   SEED_BASE_URL=http://localhost:8080 npx tsx scripts/seed-data.ts
 *
 * Los empleados (analyst/teller/supervisor/operator/commercial) se crean una
 * vez vía adaptadores de persistencia (bootstrap); todo lo demás va por HTTP.
 */
import 'dotenv/config';
import { bootstrapPersistence } from '../src/application/infrastructure/database/bootstrap';
import { PasswordSecurityAdapter } from '../src/application/infrastructure/security/PasswordSecurityAdapter';
import { User } from '../src/application/domain/models/User';
import { SystemRole } from '../src/application/domain/valueobjects/SystemRole';
import { UserStatus } from '../src/application/domain/valueobjects/UserStatus';

const BASE = process.env.SEED_BASE_URL ?? 'http://localhost:8080';
const S = Date.now().toString(36);
const PASSWORD = 'Secret123!';
const PASS = { count: 0 };
const FAIL: string[] = [];

function eq(actual: unknown, expected: unknown, msg: string): void {
  if (actual !== expected) throw new Error(`${msg}: esperado ${expected}, obtenido ${actual}`);
}

async function api<T = Record<string, unknown>>(
  name: string,
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; expect: number; validate?: (b: T) => void },
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  const json = (text ? JSON.parse(text) : null) as T;
  if (res.status !== opts.expect) {
    FAIL.push(name);
    throw new Error(`[SEED-FAIL] ${name}: HTTP esperado ${opts.expect}, obtenido ${res.status}: ${text.slice(0, 200)}`);
  }
  try {
    opts.validate?.(json);
  } catch (e) {
    FAIL.push(name);
    throw new Error(`[SEED-FAIL] ${name}: ${(e as Error).message} | cuerpo: ${text.slice(0, 200)}`);
  }
  PASS.count += 1;
  console.log(`[seed ok] ${name} -> ${res.status}`);
  return json;
}

async function seedEmployees(): Promise<void> {
  const { adapters, close } = await bootstrapPersistence();
  try {
    const passwords = new PasswordSecurityAdapter();
    const staff: Array<[string, SystemRole]> = [
      ['seed-analyst', SystemRole.INTERNAL_ANALYST],
      ['seed-teller', SystemRole.TELLER_EMPLOYEE],
      ['seed-supervisor', SystemRole.BUSINESS_SUPERVISOR],
      ['seed-operator', SystemRole.BUSINESS_OPERATOR],
      ['seed-commercial', SystemRole.COMMERCIAL_EMPLOYEE],
    ];
    for (const [username, role] of staff) {
      const probe = User.forUsernameLookup(username);
      const existing = await adapters.users.findByUsername(probe);
      if (existing) {
        console.log(`[seed] empleado existente: ${username}`);
        continue;
      }
      const user = new User(
        `usr-${username}`, `${username}-id`, username, `${username}@bank.com`,
        '', '', role, username, PASSWORD, UserStatus.ACTIVE, null,
      );
      user.replacePassword(passwords.encode(PASSWORD));
      await adapters.users.save(user);
      console.log(`[seed] empleado creado: ${username} (${role.code})`);
    }
  } finally {
    await close();
  }
}

async function login(username: string, password = PASSWORD): Promise<string> {
  const body = await api<{ token: string }>('login ' + username, 'POST', '/api/v1/auth/login', {
    body: { username, password }, expect: 200,
    validate: (b) => eq(b.token.split('.').length, 3, 'JWT con 3 segmentos'),
  });
  return body.token;
}

async function main(): Promise<void> {
  await seedEmployees();
  await api('health', 'GET', '/health', { expect: 200 });

  // ---------- Acceso público §3 ----------
  const repId = `seed-rep-${S}`;
  await api('3.3 register natural REP', 'POST', '/api/v1/auth/register/natural-customer', {
    body: { identification: repId, name: 'Seed Rep', email: `rep.${S}@bank.com`, phoneNumber: '3000000001', address: 'Seed 1', birthDate: '1990-01-01' },
    expect: 201, validate: (b: Record<string, unknown>) => eq(b['identification'], repId, 'identification'),
  });
  const natA = `seed-nat-a-${S}`;
  await api('3.3 register natural A', 'POST', '/api/v1/auth/register/natural-customer', {
    body: { identification: natA, name: 'Seed A', email: `a.${S}@bank.com`, phoneNumber: '3000000002', address: 'Seed 2', birthDate: '1992-02-02' },
    expect: 201,
  });
  const natB = `seed-nat-b-${S}`;
  await api('3.3 register natural B', 'POST', '/api/v1/auth/register/natural-customer', {
    body: { identification: natB, name: 'Seed B', email: `b.${S}@bank.com`, phoneNumber: '3000000003', address: 'Seed 3', birthDate: '1993-03-03' },
    expect: 201,
  });
  const bizC = `seed-biz-${S}`;
  await api('3.4 register business C', 'POST', '/api/v1/auth/register/business-customer', {
    body: { identification: bizC, name: 'Seed Corp', email: `c.${S}@bank.com`, phoneNumber: '6040000000', address: 'Seed Corp', legalRepresentativeIdentification: repId },
    expect: 201, validate: (b: Record<string, unknown>) => eq(b['customerType'], 'BUSINESS', 'customerType'),
  });
  const userA = `seedusera${S}`;
  await api('3.5 register user A', 'POST', '/api/v1/auth/register/user', {
    body: { customerIdentification: natA, username: userA, password: PASSWORD, role: 'NATURAL_CUSTOMER' },
    expect: 201,
  });
  const userB = `seeduserb${S}`;
  await api('3.5 register user B', 'POST', '/api/v1/auth/register/user', {
    body: { customerIdentification: natB, username: userB, password: PASSWORD, role: 'NATURAL_CUSTOMER' },
    expect: 201,
  });
  const userC = `seeduserc${S}`;
  await api('3.5 register user C (empresa)', 'POST', '/api/v1/auth/register/user', {
    body: { customerIdentification: bizC, username: userC, password: PASSWORD, role: 'BUSINESS_CUSTOMER' },
    expect: 201, validate: (b: Record<string, unknown>) => eq(b['role'], 'BUSINESS_CUSTOMER', 'role'),
  });
  const tokA = await login(userA);
  const tokC = await login(userC);
  const tokTeller = await login('seed-teller');
  const tokAnalyst = await login('seed-analyst');
  const tokSupervisor = await login('seed-supervisor');
  const tokCommercial = await login('seed-commercial');

  // ---------- Teller: cuentas y fondeo ----------
  const accA1 = `SEED-A1-${S}`;
  const accA2 = `SEED-A2-${S}`;
  const accB1 = `SEED-B1-${S}`;
  const accC1 = `SEED-C1-${S}`;
  const open = async (n: string, owner: string) =>
    api(`teller open ${n}`, 'POST', '/api/v1/teller/accounts', {
      token: tokTeller,
      body: { accountNumber: n, accountType: 'SAVINGS', currency: 'COP', ownerIdentification: owner },
      expect: 200, validate: (b: Record<string, unknown>) => eq(b['accountNumber'], n, 'accountNumber'),
    });
  await open(accA1, natA);
  await open(accA2, natA);
  await open(accB1, natB);
  await open(accC1, bizC);
  const deposit = async (n: string, amount: number) =>
    api(`8.1 deposit ${n} ${amount}`, 'POST', `/api/v1/teller/accounts/${n}/deposits`, {
      token: tokTeller, body: { amount, reference: `seed ${S}` }, expect: 200,
      validate: (b: Record<string, unknown>) => eq(typeof b['availableBalance'], 'number', 'availableBalance'),
    });
  await deposit(accA1, 20000);
  await deposit(accB1, 5000);
  await deposit(accC1, 60000000);
  await api('8.2 withdraw', 'POST', `/api/v1/teller/accounts/${accB1}/withdrawals`, {
    token: tokTeller, body: { amount: 1000 }, expect: 200,
    validate: (b: Record<string, unknown>) => eq(b['availableBalance'], 4000, 'balance tras retiro'),
  });
  await api('8.3 block', 'PATCH', `/api/v1/teller/accounts/${accB1}/block`, {
    token: tokTeller, expect: 200,
    validate: (b: Record<string, unknown>) => eq(b['status'], 'BLOCKED', 'status'),
  });
  await api('teller unblock', 'PATCH', `/api/v1/teller/accounts/${accB1}/unblock`, {
    token: tokTeller, expect: 200,
    validate: (b: Record<string, unknown>) => eq(b['status'], 'ACTIVE', 'status'),
  });
  await api('teller consult account', 'GET', `/api/v1/teller/accounts/${accA1}`, {
    token: tokTeller, expect: 200,
  });
  await api('teller consult customer', 'GET', `/api/v1/teller/customers?identification=${natA}`, {
    token: tokTeller, expect: 200,
  });

  // ---------- Natural A §4 ----------
  await api('4.1 profile', 'GET', '/api/v1/natural-customer/profile', {
    token: tokA, expect: 200,
    validate: (b: Record<string, unknown>) => eq(b['identification'], natA, 'identification'),
  });
  await api('4.2 update profile', 'PUT', '/api/v1/natural-customer/profile', {
    token: tokA, body: { email: `a2.${S}@bank.com`, phoneNumber: '3000000009', address: 'Seed 2B' },
    expect: 200, validate: (b: Record<string, unknown>) => eq(b['email'], `a2.${S}@bank.com`, 'email'),
  });
  await api('4.3 accounts', 'GET', '/api/v1/natural-customer/accounts', {
    token: tokA, expect: 200,
    validate: (b: unknown) => eq(Array.isArray(b) && (b as unknown[]).length >= 2, true, 'cuentas de A'),
  });
  await api('4.4 balance', 'GET', `/api/v1/natural-customer/accounts/${accA1}/balance`, {
    token: tokA, expect: 200,
    validate: (b: Record<string, unknown>) => eq(b['availableBalance'], 20000, 'balance'),
  });
  const loan1 = await api<{ loanId: string; status: string }>('4.5 request loan L1', 'POST', '/api/v1/natural-customer/loans', {
    token: tokA,
    body: { loanType: 'PERSONAL', requestedAmount: 5000000, termInMonths: 24, destinationAccountNumber: accA1 },
    expect: 201, validate: (b) => eq(typeof b.loanId, 'string', 'loanId'),
  });
  await api('4.6 loan details', 'GET', `/api/v1/natural-customer/loans/${loan1.loanId}`, {
    token: tokA, expect: 200,
    validate: (b: Record<string, unknown>) => eq(b['loanId'], loan1.loanId, 'loanId'),
  });
  await api('4.8 create&execute transfer', 'POST', '/api/v1/natural-customer/transfers', {
    token: tokA,
    body: { sourceAccountNumber: accA1, destinationAccountNumber: accA2, amount: 1500, description: `seed ${S}` },
    expect: 201, validate: (b: Record<string, unknown>) => eq(b['status'], 'EXECUTED', 'status'),
  });
  await api('4.9 operations', 'GET', `/api/v1/natural-customer/operations?accountNumber=${accA1}`, {
    token: tokA, expect: 200,
    validate: (b: unknown) => eq(Array.isArray(b), true, 'lista de operaciones'),
  });

  // ---------- Empresa C §5 + operador §6 + supervisor §7 ----------
  await api('5.1 company profile', 'GET', '/api/v1/business-customer/profile', {
    token: tokC, expect: 200,
    validate: (b: Record<string, unknown>) => eq(b['identification'], bizC, 'identification'),
  });
  const userOp = `seedop${S}`;
  await api('5.2 register operator', 'POST', '/api/v1/business-customer/users', {
    token: tokC,
    body: { username: userOp, password: PASSWORD, role: 'BUSINESS_OPERATOR', email: `op.${S}@bank.com`, identification: `op-id-${S}`, name: 'Seed Op' },
    expect: 201,
  });
  const tokOp = await login(userOp);
  await api('6.x operator accounts', 'GET', '/api/v1/business-operator/accounts', {
    token: tokOp, expect: 200,
    validate: (b: unknown) => eq(Array.isArray(b) && (b as unknown[]).length >= 1, true, 'cuentas empresa'),
  });
  const mkTransfer = async (tag: string, amount: number) =>
    api<{ transferId: string; status: string }>(tag, 'POST', '/api/v1/business-operator/transfers', {
      token: tokOp,
      body: { sourceAccountNumber: accC1, destinationAccountNumber: accA1, amount, description: `seed ${S}` },
      expect: 202, validate: (b) => eq(b.status, 'WAITING_FOR_APPROVAL', 'waiting'),
    });
  const t1 = await mkTransfer('6.1 transfer T1 50M', 50000000);
  const t2 = await mkTransfer('6.1 transfer T2 40M', 40000000);
  const t3 = await mkTransfer('6.1 transfer T3 30M', 30000000);
  await api('5.3 business approve T1', 'PATCH', `/api/v1/business-customer/transfers/${t1.transferId}/approve`, {
    token: tokC, expect: 200,
    validate: (b: Record<string, unknown>) => eq(b['status'], 'APPROVED', 'status'),
  });
  await api('5.4 business reject T2', 'PATCH', `/api/v1/business-customer/transfers/${t2.transferId}/reject`, {
    token: tokC, body: { rejectionReason: 'Monto excede presupuesto semanal' }, expect: 200,
    validate: (b: Record<string, unknown>) => eq(b['status'], 'REJECTED', 'status'),
  });
  await api('7.1 pending contains T3', 'GET', '/api/v1/business-supervisor/transfers/pending', {
    token: tokSupervisor, expect: 200,
    validate: (b: unknown) => eq(
      Array.isArray(b) && (b as Array<{ transferId: string }>).some((t) => t.transferId === t3.transferId),
      true, 'T3 en pendientes'),
  });
  await api('7.2 supervisor approve T3', 'PATCH', `/api/v1/business-supervisor/transfers/${t3.transferId}/approve`, {
    token: tokSupervisor, expect: 200,
    validate: (b: Record<string, unknown>) => eq(b['status'], 'APPROVED', 'status'),
  });

  // ---------- Commercial §9 ----------
  await api('9.1 commercial loan for A', 'POST', '/api/v1/commercial/loans', {
    token: tokCommercial,
    body: { customerIdentification: natA, loanType: 'PERSONAL', requestedAmount: 1000000, termInMonths: 12, destinationAccountNumber: accA1 },
    expect: 201,
  });

  // ---------- Analyst §10 ----------
  const empUser = `seedemp${S}`;
  await api('10.1 register employee', 'POST', '/api/v1/internal-analyst/users/employee', {
    token: tokAnalyst,
    body: { username: empUser, password: PASSWORD, role: 'TELLER_EMPLOYEE', email: `emp.${S}@bank.com`, identification: `emp-id-${S}`, name: 'Seed Emp' },
    expect: 201,
  });
  await api('10.2 block customer B', 'PATCH', `/api/v1/internal-analyst/customers/${natB}/status`, {
    token: tokAnalyst, body: { status: 'BLOCKED', reason: 'seed' }, expect: 200,
    validate: (b: Record<string, unknown>) => eq(b['status'], 'BLOCKED', 'status'),
  });
  await api('10.2 activate customer B', 'PATCH', `/api/v1/internal-analyst/customers/${natB}/status`, {
    token: tokAnalyst, body: { status: 'ACTIVE', reason: 'seed' }, expect: 200,
    validate: (b: Record<string, unknown>) => eq(b['status'], 'ACTIVE', 'status'),
  });
  await api('10.3 approve L1', 'PATCH', `/api/v1/internal-analyst/loans/${loan1.loanId}/approve`, {
    token: tokAnalyst, body: { approvedAmount: 5000000, interestRate: 1.45 }, expect: 200,
    validate: (b: Record<string, unknown>) => eq(b['status'], 'APPROVED', 'status'),
  });
  await api('10.4 disburse L1', 'POST', `/api/v1/internal-analyst/loans/${loan1.loanId}/disburse`, {
    token: tokAnalyst, expect: 200,
    validate: (b: Record<string, unknown>) => eq(b['status'], 'DISBURSED', 'status'),
  });
  await api('4.7 loan payment L1', 'POST', `/api/v1/natural-customer/loans/${loan1.loanId}/payments`, {
    token: tokA, body: { sourceAccountNumber: accA1, amount: 250000 }, expect: 200,
  });
  const loan2 = await api<{ loanId: string }>('4.5 request loan L2', 'POST', '/api/v1/natural-customer/loans', {
    token: tokA,
    body: { loanType: 'PERSONAL', requestedAmount: 2000000, termInMonths: 12, destinationAccountNumber: accA1 },
    expect: 201, validate: (b) => eq(typeof b.loanId, 'string', 'loanId'),
  });
  await api('analyst reject L2', 'PATCH', `/api/v1/internal-analyst/loans/${loan2.loanId}/reject`, {
    token: tokAnalyst, expect: 200,
    validate: (b: Record<string, unknown>) => eq(b['status'], 'REJECTED', 'status'),
  });
  const loan3 = await api<{ loanId: string }>('4.5 request loan L3', 'POST', '/api/v1/natural-customer/loans', {
    token: tokA,
    body: { loanType: 'PERSONAL', requestedAmount: 3000000, termInMonths: 12, destinationAccountNumber: accA1 },
    expect: 201, validate: (b) => eq(typeof b.loanId, 'string', 'loanId'),
  });
  await api('10.6 delete/close L3', 'DELETE', `/api/v1/internal-analyst/loans/${loan3.loanId}`, {
    token: tokAnalyst, expect: 204,
  });
  await api('L3 closed', 'GET', `/api/v1/natural-customer/loans/${loan3.loanId}`, {
    token: tokA, expect: 200,
    validate: (b: Record<string, unknown>) => eq(b['status'], 'CLOSED', 'status'),
  });
  await api('10.5 audit-logs paged', 'GET', '/api/v1/internal-analyst/audit-logs?page=0&size=5', {
    token: tokAnalyst, expect: 200,
    validate: (b: Record<string, unknown>) => {
      eq(Array.isArray(b['content']), true, 'content');
      eq(typeof b['totalElements'], 'number', 'totalElements');
      eq(typeof b['totalPages'], 'number', 'totalPages');
    },
  });
  await api('10.5 audit-logs filter', 'GET', '/api/v1/internal-analyst/audit-logs?operationType=TRANSFER_EXECUTION&size=50', {
    token: tokAnalyst, expect: 200,
    validate: (b: Record<string, unknown>) => eq(
      (b['content'] as Array<{ operationType: string }>).every((l) => l.operationType === 'TRANSFER_EXECUTION'),
      true, 'filtro operationType'),
  });
  await api('logout A', 'POST', '/api/v1/auth/logout', { token: tokA, expect: 204 });

  console.log(`\n[seed] COMPLETO corrida ${S}: ${PASS.count} pasos OK, ${FAIL.length} fallos`);
  if (FAIL.length > 0) {
    console.error(`[seed] fallos: ${FAIL.join(', ')}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(`[seed] ERROR: ${(e as Error).message}`);
  process.exit(1);
});
