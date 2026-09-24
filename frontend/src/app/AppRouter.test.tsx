/**
 * AppRouter (F5): los enlaces de navegación por rol resuelven a su módulo;
 * en particular los alias de paneles de una sola página nunca caen en NotFound.
 */
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { AppRouter } from './AppRouter';
import { ServicesProvider, SessionProvider } from '../application/session/SessionProvider';
import type { AppServices } from '../application/container';
import type { Session } from '../domain/models';
import type { SystemRole } from '../domain/enums';

function sessionWith(role: SystemRole): Session {
  return {
    token: 't',
    tokenType: 'Bearer',
    expiresIn: 3600,
    expiresAt: Date.now() + 3600_000,
    user: { userId: 'u1', username: 'op', email: 'op@banco.com', role },
  };
}

function servicesWith(session: Session): AppServices {
  const noop = vi.fn(async () => undefined);
  return {
    session: {
      saveSession: vi.fn(),
      readSession: vi.fn(() => session),
      getAccessToken: vi.fn(() => 't'),
      clearSession: vi.fn(),
      isExpired: vi.fn(() => false),
    },
    auth: { login: noop, logout: noop, registerNaturalCustomer: noop, registerBusinessCustomer: noop, registerCustomerUser: noop, registerCompanyUser: noop, registerEmployeeUser: noop, getCurrentSession: vi.fn(() => session) },
    customers: { getMyProfile: noop, updateMyProfile: noop, getCompanyProfile: noop, getCustomer: noop, changeCustomerStatus: noop },
    accounts: { getMyAccounts: noop, getCompanyAccounts: noop, getAccount: noop, getBalance: noop, openAccount: noop, deposit: noop, withdraw: noop, blockAccount: noop, unblockAccount: noop, closeAccount: noop },
    loans: { requestLoan: noop, requestLoanForCustomer: noop, getLoan: noop, registerPayment: noop, approveLoan: noop, rejectLoan: noop, disburseLoan: noop, closeLoan: noop },
    transfers: { createNaturalTransfer: noop, createBusinessTransfer: noop, approveTransfer: noop, rejectTransfer: noop, getPendingTransfers: noop },
    audits: {
      getMyOperations: noop,
      getAuditLogs: vi.fn(async () => ({ content: [], totalElements: 0, totalPages: 0 })),
    },
    system: { health: noop },
    alerts: {
      showValidationError: noop, showAuthenticationError: noop, showAuthorizationError: noop,
      showConflict: noop, showDependencyError: noop, showUnexpectedError: noop,
      confirmFinancialAction: vi.fn(async () => true), showSuccess: noop, showExpiredSession: noop,
    },
  } as unknown as AppServices;
}

async function renderAt(role: SystemRole, entry: string) {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <ServicesProvider services={servicesWith(sessionWith(role))}>
        <SessionProvider>
          <AppRouter />
        </SessionProvider>
      </ServicesProvider>
    </MemoryRouter>,
  );
}

describe('AppRouter aliases', () => {
  it('/teller/accounts muestra Ventanilla (no NotFound)', async () => {
    await renderAt('TELLER_EMPLOYEE', '/teller/accounts');
    expect(await screen.findByRole('heading', { name: 'Ventanilla' })).toBeInTheDocument();
    expect(screen.queryByText('Página no encontrada')).not.toBeInTheDocument();
  });

  it('/commercial/loans muestra Cartera comercial', async () => {
    await renderAt('COMMERCIAL_EMPLOYEE', '/commercial/loans');
    expect(await screen.findByRole('heading', { name: 'Cartera comercial' })).toBeInTheDocument();
  });

  it.each(['/analyst/customers', '/analyst/loans', '/analyst/employees', '/analyst/audit'])(
    '%s muestra el panel de analista',
    async (entry) => {
      await renderAt('INTERNAL_ANALYST', entry);
      expect(await screen.findByRole('heading', { name: 'Panel de analista' })).toBeInTheDocument();
      expect(screen.queryByText('Página no encontrada')).not.toBeInTheDocument();
    },
  );
});
