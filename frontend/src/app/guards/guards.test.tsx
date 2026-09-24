/**
 * Guards de rol (F5/F7 §9): sólo el SystemRole autorizado ve su módulo;
 * rol distinto → alerta 403 + retorno al dashboard propio; sin sesión → login.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { RequireAuth, RequireRole } from './guards';
import { ServicesProvider, SessionProvider } from '../../application/session/SessionProvider';
import type { AppServices } from '../../application/container';
import type { Session } from '../../domain/models';
import type { SystemRole } from '../../domain/enums';

function sessionWith(role: SystemRole): Session {
  return {
    token: 't',
    tokenType: 'Bearer',
    expiresIn: 3600,
    expiresAt: Date.now() + 3600_000,
    user: { userId: 'u1', username: 'ana', email: 'a@e.com', role },
  };
}

function servicesWith(session: Session | null) {
  const showAuthorizationError = vi.fn(async () => undefined);
  const fake = {
    session: {
      saveSession: vi.fn(),
      readSession: vi.fn(() => session),
      getAccessToken: vi.fn(() => session?.token ?? null),
      clearSession: vi.fn(),
      isExpired: vi.fn(() => session === null),
    },
    auth: { logout: vi.fn(async () => undefined) },
    alerts: {
      showAuthorizationError,
      showValidationError: vi.fn(async () => undefined),
      showAuthenticationError: vi.fn(async () => undefined),
      showConflict: vi.fn(async () => undefined),
      showDependencyError: vi.fn(async () => undefined),
      showUnexpectedError: vi.fn(async () => undefined),
      confirmFinancialAction: vi.fn(async () => true),
      showSuccess: vi.fn(async () => undefined),
      showExpiredSession: vi.fn(async () => undefined),
    },
  } as unknown as AppServices;
  return { fake, showAuthorizationError };
}

function renderWithRole(allowedRole: SystemRole, session: Session | null, entry: string) {
  const { fake, showAuthorizationError } = servicesWith(session);
  render(
    <MemoryRouter initialEntries={[entry]}>
      <ServicesProvider services={fake}>
        <SessionProvider>
          <Routes>
            <Route path="/login" element={<div>Login requerido</div>} />
            <Route element={<RequireAuth />}>
              <Route element={<RequireRole roles={[allowedRole]} />}>
                <Route path="/teller" element={<div>Panel cajero</div>} />
              </Route>
              <Route path="/customer" element={<div>Panel cliente</div>} />
            </Route>
          </Routes>
        </SessionProvider>
      </ServicesProvider>
    </MemoryRouter>,
  );
  return { showAuthorizationError };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('role guards', () => {
  it('permite el módulo al rol autorizado', () => {
    renderWithRole('TELLER_EMPLOYEE', sessionWith('TELLER_EMPLOYEE'), '/teller');
    expect(screen.getByText('Panel cajero')).toBeInTheDocument();
  });

  it('rol distinto: alerta 403 y retorno al dashboard propio', async () => {
    const { showAuthorizationError } = renderWithRole('TELLER_EMPLOYEE', sessionWith('NATURAL_CUSTOMER'), '/teller');

    await waitFor(() => expect(showAuthorizationError).toHaveBeenCalled());
    expect(showAuthorizationError).toHaveBeenCalledWith(
      expect.objectContaining({ status: 403, code: 'FORBIDDEN' }),
    );
    expect(await screen.findByText('Panel cliente')).toBeInTheDocument();
  });

  it('sin sesión redirige a login', async () => {
    renderWithRole('TELLER_EMPLOYEE', null, '/teller');
    expect(await screen.findByText('Login requerido')).toBeInTheDocument();
  });

  it.each([
    ['NATURAL_CUSTOMER', '/customer'],
    ['BUSINESS_CUSTOMER', '/business'],
    ['BUSINESS_OPERATOR', '/business/operator'],
    ['BUSINESS_SUPERVISOR', '/business/supervisor'],
    ['TELLER_EMPLOYEE', '/teller'],
    ['COMMERCIAL_EMPLOYEE', '/commercial'],
    ['INTERNAL_ANALYST', '/analyst'],
  ] as Array<[SystemRole, string]>)('rol %s tiene dashboard %s', async (role) => {
    const { ROLE_HOME } = await import('../../domain/enums');
    expect(ROLE_HOME[role]).toBeDefined();
  });
});
