/**
 * Cobertura de endpoints (F3/F7): cada fila user-facing de
 * Frontend-Adapters.md §4 tiene un servicio que emite método, path, auth y
 * cuerpo/sin-cuerpo según el contrato backend autoritativo.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { HttpPort, HttpRequestOptions, SessionPort } from '../../domain/ports';
import { createAuthService } from './authService';
import { createAccountService, createCustomerService } from './customerAccountServices';
import { createLoanService } from './loanService';
import { createAuditService, createSystemService, createTransferService } from './transferAuditServices';

interface Call extends HttpRequestOptions {
  url: string;
}

function cannedResponse(path: string, method: string): unknown {
  if (path === '/api/v1/auth/login') {
    return {
      token: 't',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: { userId: 'u1', username: 'ana', email: 'a@e.com', role: 'NATURAL_CUSTOMER' },
    };
  }
  if (path === '/api/v1/business-customer/users' || path === '/api/v1/auth/register/user' || path === '/api/v1/internal-analyst/users/employee') {
    return { userId: 'usr_1', username: 'op1', role: 'BUSINESS_OPERATOR', status: 'ACTIVE' };
  }
  if (path.includes('/balance') || path.includes('/deposits') || path.includes('/withdrawals')) {
    return { accountNumber: 'CTA-1', availableBalance: 1000, currency: 'COP' };
  }
  if (path.includes('/loans') && (path.includes('/payments') || method === 'GET') && path.includes('/payments')) {
    return { loanId: 'LOAN-1', status: 'DISBURSED' };
  }
  if (path.includes('/loans')) {
    return { loanId: 'LOAN-1', loanType: 'PERSONAL', requestedAmount: 100, status: 'UNDER_REVIEW', termInMonths: 12 };
  }
  if (path.includes('/transfers')) {
    const single = {
      transferId: 'TRF-1',
      sourceAccountNumber: 'CTA-1',
      destinationAccountNumber: 'CTA-2',
      amount: 10,
      status: 'EXECUTED',
    };
    // GET pending devuelve lista; mutaciones devuelven el recurso.
    return path.includes('/pending') ? [single] : single;
  }
  if (path.includes('/audit-logs')) {
    return { content: [], totalElements: 0, totalPages: 0 };
  }
  if (path.includes('/operations')) return [];
  if (path.includes('/accounts')) {
    // POST /teller/accounts (apertura) devuelve el recurso único; los GET de
    // colección devuelven lista; el detalle teller devuelve el recurso.
    const singleAccount = {
      accountNumber: 'CTA-1',
      accountType: 'SAVINGS',
      ownerIdentification: '1017',
      availableBalance: 100,
      currency: 'COP',
      status: 'ACTIVE',
    };
    if (method === 'POST' || path.includes('/teller/accounts/CTA')) return singleAccount;
    return [singleAccount];
  }
  if (path === '/health') return { status: 'UP' };
  return {
    identification: '1017',
    name: 'Ana',
    email: 'a@e.com',
    status: 'ACTIVE',
    customerType: path.includes('business') && !path.includes('users') ? 'BUSINESS' : 'NATURAL',
  };
}

function harness() {
  const calls: Call[] = [];
  const request = (async (options: HttpRequestOptions): Promise<unknown> => {
    calls.push({ ...options, url: options.path });
    return cannedResponse(options.path, options.method);
  }) as HttpPort['request'];
  const http: HttpPort = { request };
  const session: SessionPort = {
    saveSession: vi.fn(),
    readSession: vi.fn(() => null),
    getAccessToken: vi.fn(() => 't'),
    clearSession: vi.fn(),
    isExpired: vi.fn(() => false),
  };
  return { calls, http, session };
}

function last(calls: Call[]): Call {
  const call = calls[calls.length - 1];
  if (!call) throw new Error('sin llamadas registradas');
  return call;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('endpoint mapping (Frontend-Adapters.md §4)', () => {
  it('auth: login público, logout JWT, registros en sus paths', async () => {
    const { calls, http, session } = harness();
    const auth = createAuthService(http, session);

    await auth.login('ana', 'Secret123!');
    expect(last(calls)).toMatchObject({ method: 'POST', path: '/api/v1/auth/login', requiresAuth: false });
    expect(session.saveSession).toHaveBeenCalled();

    await auth.logout();
    expect(last(calls)).toMatchObject({ method: 'POST', path: '/api/v1/auth/logout' });
    expect(session.clearSession).toHaveBeenCalled();

    await auth.registerNaturalCustomer({ identification: '1', name: 'n', email: 'e@e.com', phoneNumber: '3001', address: 'a', birthDate: '1990-01-01' });
    expect(last(calls)).toMatchObject({ method: 'POST', path: '/api/v1/auth/register/natural-customer', requiresAuth: false });

    await auth.registerBusinessCustomer({ identification: '1', name: 'n', email: 'e@e.com', phoneNumber: '3001', address: 'a', legalRepresentativeIdentification: '2' });
    expect(last(calls)).toMatchObject({ method: 'POST', path: '/api/v1/auth/register/business-customer', requiresAuth: false });

    await auth.registerCustomerUser({ customerIdentification: '1', username: 'u', password: 'Secret123!', role: 'NATURAL_CUSTOMER' });
    expect(last(calls)).toMatchObject({ method: 'POST', path: '/api/v1/auth/register/user', requiresAuth: false });

    await auth.registerCompanyUser({ username: 'u', password: 'p', role: 'BUSINESS_OPERATOR', email: 'e', identification: 'i', name: 'n' });
    expect(last(calls)).toMatchObject({ method: 'POST', path: '/api/v1/business-customer/users' });

    await auth.registerEmployeeUser({ username: 'u', password: 'p', role: 'TELLER_EMPLOYEE', email: 'e', identification: 'i', name: 'n' });
    expect(last(calls)).toMatchObject({ method: 'POST', path: '/api/v1/internal-analyst/users/employee' });
  });

  it('customers + accounts cubren perfil, búsqueda teller y ciclo de cuenta', async () => {
    const { calls, http } = harness();
    const customers = createCustomerService(http);
    const accounts = createAccountService(http);

    await customers.getMyProfile();
    expect(last(calls)).toMatchObject({ method: 'GET', path: '/api/v1/natural-customer/profile' });
    await customers.updateMyProfile({ email: 'n@e.com' });
    expect(last(calls)).toMatchObject({ method: 'PUT', path: '/api/v1/natural-customer/profile' });
    await customers.getCompanyProfile();
    expect(last(calls)).toMatchObject({ method: 'GET', path: '/api/v1/business-customer/profile' });
    await customers.getCustomer('1017');
    expect(last(calls)).toMatchObject({ method: 'GET', path: '/api/v1/teller/customers' });
    await customers.changeCustomerStatus('1017', { status: 'BLOCKED' });
    expect(last(calls)).toMatchObject({ method: 'PATCH', path: '/api/v1/internal-analyst/customers/1017/status' });

    await accounts.getMyAccounts();
    expect(last(calls)).toMatchObject({ method: 'GET', path: '/api/v1/natural-customer/accounts' });
    await accounts.getCompanyAccounts();
    expect(last(calls)).toMatchObject({ method: 'GET', path: '/api/v1/business-operator/accounts' });
    await accounts.getAccount('CTA-1');
    expect(last(calls)).toMatchObject({ method: 'GET', path: '/api/v1/teller/accounts/CTA-1' });
    await accounts.getBalance('CTA-1');
    expect(last(calls)).toMatchObject({ method: 'GET', path: '/api/v1/natural-customer/accounts/CTA-1/balance' });
    await accounts.openAccount({ accountType: 'SAVINGS', currency: 'COP', ownerIdentification: '1017' });
    expect(last(calls)).toMatchObject({ method: 'POST', path: '/api/v1/teller/accounts' });
    await accounts.deposit('CTA-1', { amount: 10 });
    expect(last(calls)).toMatchObject({ method: 'POST', path: '/api/v1/teller/accounts/CTA-1/deposits' });
    await accounts.withdraw('CTA-1', { amount: 10 });
    expect(last(calls)).toMatchObject({ method: 'POST', path: '/api/v1/teller/accounts/CTA-1/withdrawals' });
    await accounts.blockAccount('CTA-1', 'motivo');
    expect(last(calls)).toMatchObject({ method: 'PATCH', path: '/api/v1/teller/accounts/CTA-1/block' });
    await accounts.unblockAccount('CTA-1');
    expect(last(calls)).toMatchObject({ method: 'PATCH', path: '/api/v1/teller/accounts/CTA-1/unblock' });
    await accounts.closeAccount('CTA-1');
    expect(last(calls)).toMatchObject({ method: 'PATCH', path: '/api/v1/teller/accounts/CTA-1/close' });
  });

  it('loans cubren solicitud, pago, comercial y ciclo analista', async () => {
    const { calls, http } = harness();
    const loans = createLoanService(http);
    const base = { loanType: 'PERSONAL', requestedAmount: 100, termInMonths: 12, destinationAccountNumber: 'CTA-1' };

    await loans.requestLoan(base);
    expect(last(calls)).toMatchObject({ method: 'POST', path: '/api/v1/natural-customer/loans' });
    await loans.requestLoanForCustomer({ ...base, customerIdentification: '1017' });
    expect(last(calls)).toMatchObject({ method: 'POST', path: '/api/v1/commercial/loans' });
    await loans.getLoan('LOAN-1');
    expect(last(calls)).toMatchObject({ method: 'GET', path: '/api/v1/natural-customer/loans/LOAN-1' });
    await loans.registerPayment('LOAN-1', { sourceAccountNumber: 'CTA-1', amount: 10 });
    expect(last(calls)).toMatchObject({ method: 'POST', path: '/api/v1/natural-customer/loans/LOAN-1/payments' });
    await loans.approveLoan('LOAN-1', { approvedAmount: 100, interestRate: 1.5 });
    expect(last(calls)).toMatchObject({ method: 'PATCH', path: '/api/v1/internal-analyst/loans/LOAN-1/approve' });
    await loans.rejectLoan('LOAN-1');
    expect(last(calls)).toMatchObject({ method: 'PATCH', path: '/api/v1/internal-analyst/loans/LOAN-1/reject' });
    await loans.disburseLoan('LOAN-1');
    expect(last(calls)).toMatchObject({ method: 'POST', path: '/api/v1/internal-analyst/loans/LOAN-1/disburse' });
    await loans.closeLoan('LOAN-1');
    expect(last(calls)).toMatchObject({ method: 'DELETE', path: '/api/v1/internal-analyst/loans/LOAN-1' });
  });

  it('transfers: creación por rol y approve/reject con cuerpo según contrato', async () => {
    const { calls, http } = harness();
    const transfers = createTransferService(http);
    const payload = { sourceAccountNumber: 'CTA-1', destinationAccountNumber: 'CTA-2', amount: 10 };

    await transfers.createNaturalTransfer(payload);
    expect(last(calls)).toMatchObject({ method: 'POST', path: '/api/v1/natural-customer/transfers' });
    await transfers.createBusinessTransfer(payload);
    expect(last(calls)).toMatchObject({ method: 'POST', path: '/api/v1/business-operator/transfers' });
    await transfers.approveTransfer('TRF-1', 'business-customer');
    expect(last(calls)).toMatchObject({ method: 'PATCH', path: '/api/v1/business-customer/transfers/TRF-1/approve' });
    await transfers.approveTransfer('TRF-1', 'business-supervisor');
    expect(last(calls)).toMatchObject({ method: 'PATCH', path: '/api/v1/business-supervisor/transfers/TRF-1/approve' });

    await transfers.rejectTransfer('TRF-1', { rejectionReason: 'sin presupuesto' }, 'business-customer');
    const businessReject = last(calls);
    expect(businessReject).toMatchObject({ method: 'PATCH', path: '/api/v1/business-customer/transfers/TRF-1/reject' });
    expect(businessReject.body).toEqual({ rejectionReason: 'sin presupuesto' });

    // Contrato §7.3: el supervisor rechaza SIN cuerpo; enviarlo provocaría 400.
    await transfers.rejectTransfer('TRF-1', { rejectionReason: 'x' }, 'business-supervisor');
    const supervisorReject = last(calls);
    expect(supervisorReject).toMatchObject({ method: 'PATCH', path: '/api/v1/business-supervisor/transfers/TRF-1/reject' });
    expect(supervisorReject.body).toBeUndefined();

    await transfers.getPendingTransfers();
    expect(last(calls)).toMatchObject({ method: 'GET', path: '/api/v1/business-supervisor/transfers/pending' });
  });

  it('audits + health: operaciones propias, bitácora paginada y smoke público', async () => {
    const { calls, http } = harness();
    const audits = createAuditService(http);
    const system = createSystemService(http);

    await audits.getMyOperations();
    expect(last(calls)).toMatchObject({ method: 'GET', path: '/api/v1/natural-customer/operations' });
    await audits.getAuditLogs({ userId: 'u1', page: 0, size: 20 });
    const auditCall = last(calls);
    expect(auditCall).toMatchObject({ method: 'GET', path: '/api/v1/internal-analyst/audit-logs' });
    expect(auditCall.query).toMatchObject({ userId: 'u1', page: 0, size: 20 });
    await system.health();
    expect(last(calls)).toMatchObject({ method: 'GET', path: '/health', requiresAuth: false });
  });
});
