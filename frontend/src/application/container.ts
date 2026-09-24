/**
 * Composition root (F2/F3): única ubicación que instancia adaptadores y
 * servicios. Los componentes reciben el контexto vía React; nunca construyen
 * URLs ni headers Authorization.
 */

import { createHttpAdapter } from '../adapters/http/httpAdapter';
import { createSessionAdapter } from '../adapters/auth/sessionAdapter';
import { createAlertAdapter } from '../adapters/alerts/alertAdapter';
import { createAuthService, type AuthService } from './services/authService';
import { createCustomerService, createAccountService } from './services/customerAccountServices';
import { createLoanService, type LoanService } from './services/loanService';
import {
  createTransferService,
  createAuditService,
  createSystemService,
  type TransferService,
  type AuditService,
} from './services/transferAuditServices';
import type { AlertPort, HttpPort, SessionListener, SessionPort } from '../domain/ports';

export type SessionListenerEvent = Parameters<SessionListener>[0];

export interface CustomerService {
  getMyProfile: ReturnType<typeof createCustomerService>['getMyProfile'];
  updateMyProfile: ReturnType<typeof createCustomerService>['updateMyProfile'];
  getCompanyProfile: ReturnType<typeof createCustomerService>['getCompanyProfile'];
  getCustomer: ReturnType<typeof createCustomerService>['getCustomer'];
  changeCustomerStatus: ReturnType<typeof createCustomerService>['changeCustomerStatus'];
}

export interface AccountService {
  getMyAccounts: ReturnType<typeof createAccountService>['getMyAccounts'];
  getCompanyAccounts: ReturnType<typeof createAccountService>['getCompanyAccounts'];
  getAccount: ReturnType<typeof createAccountService>['getAccount'];
  getBalance: ReturnType<typeof createAccountService>['getBalance'];
  openAccount: ReturnType<typeof createAccountService>['openAccount'];
  deposit: ReturnType<typeof createAccountService>['deposit'];
  withdraw: ReturnType<typeof createAccountService>['withdraw'];
  blockAccount: ReturnType<typeof createAccountService>['blockAccount'];
  unblockAccount: ReturnType<typeof createAccountService>['unblockAccount'];
  closeAccount: ReturnType<typeof createAccountService>['closeAccount'];
}

export interface AppServices {
  auth: AuthService;
  customers: CustomerService;
  accounts: AccountService;
  loans: LoanService;
  transfers: TransferService;
  audits: AuditService;
  system: { health: () => Promise<{ status: string; persistence?: string }> };
  alerts: AlertPort;
  session: SessionPort;
}

export function createServices(): AppServices {
  const session = createSessionAdapter();
  // Puente hacia el SessionProvider de React (montado después de este módulo).
  const onSessionEvent: SessionListener = (event) => {
    const notify = (window as unknown as { __auroraNotify?: (e: SessionListenerEvent) => void }).__auroraNotify;
    notify?.(event);
  };
  const http: HttpPort = createHttpAdapter({ session, onSessionEvent });
  const alerts = createAlertAdapter();
  const customers = createCustomerService(http);
  const accounts = createAccountService(http);
  return {
    auth: createAuthService(http, session),
    customers,
    accounts,
    loans: createLoanService(http),
    transfers: createTransferService(http),
    audits: createAuditService(http),
    system: createSystemService(http),
    alerts,
    session,
  };
}
