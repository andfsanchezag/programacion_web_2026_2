/** Ventanilla — búsqueda de clientes, apertura, consulta, depósitos, retiros, bloqueo, cierre. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../application/session/SessionProvider';
import { presentError } from '../../adapters/alerts/alertAdapter';
import { Button, EmptyState } from '../../components';
import { DepositForm, WithdrawalForm, BlockUnblockClose } from './TellerForms';
import { StatusBadge } from '../../components/StatusBadge';
import { MoneyAmount } from '../../components/MoneyAmount';
import type { BankAccountSummary, CustomerSummary } from '../../domain/models';

export function TellerDashboard() {
  const { services } = useSession();
  const navigate = useNavigate();
  const [identification, setIdentification] = useState('');
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [customerPending, setCustomerPending] = useState(false);
  // Consulta de cuenta por número (GET /teller/accounts/{n}): el rol TELLER no
  // tiene "mis cuentas" (endpoint natural) ni balance natural; ambos darían 403.
  const [accountNumber, setAccountNumber] = useState('');
  const [account, setAccount] = useState<BankAccountSummary | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [consultPending, setConsultPending] = useState(false);

  const searchCustomer = async (): Promise<void> => {
    if (!identification.trim()) { setCustomerError('Ingresa la identificación del cliente.'); return; }
    setCustomerError(null); setCustomerPending(true);
    try { setCustomer(await services.customers.getCustomer(identification.trim())); }
    catch (err) { setCustomer(null); setCustomerError((err as Error).message || 'Cliente no encontrado'); await presentError(services.alerts, err); }
    finally { setCustomerPending(false); }
  };

  const consultAccount = async (): Promise<void> => {
    if (!accountNumber.trim()) { setAccountError('Ingresa el número de cuenta.'); return; }
    setAccountError(null); setConsultPending(true);
    try { setAccount(await services.accounts.getAccount(accountNumber.trim())); }
    catch (err) { setAccount(null); setAccountError((err as Error).message || 'Cuenta no encontrada'); await presentError(services.alerts, err); }
    finally { setConsultPending(false); }
  };

  const openAccount = async (): Promise<void> => {
    if (!customer) return;
    const ok = await services.alerts.confirmFinancialAction({
      title: 'Abrir cuenta para el cliente',
      details: [{ label: 'Cliente', value: `${customer.name} (${customer.identification})` }, { label: 'Tipo', value: 'Ahorros' }, { label: 'Moneda', value: 'COP' }],
      confirmLabel: 'Abrir cuenta',
    });
    if (!ok) return;
    try { const account = await services.accounts.openAccount({ accountType: 'SAVINGS', currency: 'COP', ownerIdentification: customer.identification }); await services.alerts.showSuccess(`Cuenta ${account.accountNumber} creada.`); navigate('/teller/accounts'); }
    catch (err) { await presentError(services.alerts, err); }
  };

  return (
    <div>
      <div className="page-head"><h1>Ventanilla</h1></div>

      <section className="card section" aria-label="Buscar cliente">
        <h2>Buscar cliente</h2>
        <div className="field">
          <label htmlFor="teller-search">Identificación</label>
          <input id="teller-search" value={identification} onChange={(e) => setIdentification(e.target.value)} placeholder="Ej. 1017123456" disabled={customerPending} />
          <Button onClick={searchCustomer} loading={customerPending} loadingLabel="Buscando…" disabled={customerPending}>Buscar</Button>
        </div>
        {customerError && <div className="alert alert-error" role="alert">{customerError}</div>}
      </section>

      {customer && (
        <section className="card section" aria-label="Cliente encontrado">
          <h2>{customer.name} ({customer.identification})</h2>
          <p><strong>Correo:</strong> {customer.email}</p>
          <StatusBadge kind="customer" status={customer.status} />
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
            <Button onClick={openAccount}>Abrir cuenta de ahorros</Button>
          </div>
        </section>
      )}

      {customer && (
        <section className="card section" aria-label="Consultar cuenta y operar">
          <h2>Cuentas y operaciones</h2>
          <div className="field">
            <label htmlFor="teller-acc-num">Número de cuenta</label>
            <input id="teller-acc-num" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Ej. CTA-100200300" disabled={consultPending} />
            <Button onClick={consultAccount} loading={consultPending} loadingLabel="Consultando…">Consultar</Button>
          </div>
          {accountError && <div className="alert alert-error" role="alert">{accountError}</div>}
          {account && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <p><strong>{account.accountNumber}</strong> · {account.accountType === 'SAVINGS' ? 'Ahorros' : 'Corriente'} · <MoneyAmount value={account.availableBalance} currency={account.currency} /></p>
              <StatusBadge kind="account" status={account.status} />
              <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <DepositForm accountNumber={account.accountNumber} />
                <WithdrawalForm accountNumber={account.accountNumber} />
                <BlockUnblockClose accountNumber={account.accountNumber} />
              </div>
            </div>
          )}
        </section>
      )}
      {!customer && <EmptyState title="Busca un cliente para operar" message="Ingresa la identificación y presiona Buscar para ver sus cuentas y realizar operaciones." icon="🔎" />}
    </div>
  );
}