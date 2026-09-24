/** Mis cuentas — lista + detalle de saldo por cuenta. */
import { useState } from 'react';
import { useSession } from '../../application/session/SessionProvider';
import { useAsyncResource } from '../../application/viewModels/useAsyncResource';
import { Button, DataTable, EmptyState, ErrorState, type Column } from '../../components';
import { StatusBadge } from '../../components/StatusBadge';
import { MoneyAmount } from '../../components/MoneyAmount';
import { ACCOUNT_TYPE_LABELS } from '../../domain/enums';
import type { BankAccountSummary } from '../../domain/models';

export function CustomerAccountsPage() {
  const { services } = useSession();
  const accounts = useAsyncResource(() => services.accounts.getMyAccounts());
  const [selected, setSelected] = useState<string | null>(null);
  const [balance, setBalance] = useState<{ value: number; currency: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const columns: Array<Column<BankAccountSummary>> = [
    { key: 'n', header: 'Número', render: (a) => a.accountNumber },
    { key: 'type', header: 'Tipo', render: (a) => ACCOUNT_TYPE_LABELS[a.accountType] ?? a.accountType },
    { key: 'balance', header: 'Saldo disponible', render: (a) => <MoneyAmount value={a.availableBalance} currency={a.currency} />, numeric: true },
    { key: 'status', header: 'Estado', render: (a) => <StatusBadge kind="account" status={a.status} /> },
  ];

  const select = (accountNumber: string): void => {
    setSelected(accountNumber);
    const found = accounts.data?.find((a) => a.accountNumber === accountNumber);
    if (found) setBalance({ value: found.availableBalance, currency: found.currency });
  };

  const refreshBalance = async (): Promise<void> => {
    if (!selected) return;
    setRefreshing(true);
    try {
      const b = await services.accounts.getBalance(selected);
      setBalance({ value: b.availableBalance, currency: b.currency });
    } catch {
      setBalance(null);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Mis cuentas</h1>
          <p style={{ color: 'var(--color-ink-soft)' }}>Consulta saldos y estados de cada producto.</p>
        </div>
      </div>
      {accounts.status === 'loading' && (
        <DataTable columns={columns} rows={[]} rowKey={() => 'x'} loading />
      )}
      {accounts.status === 'error' && accounts.error && (
        <ErrorState error={accounts.error} onRetry={accounts.reload} title="No pudimos cargar tus cuentas" />
      )}
      {accounts.status === 'empty' && (
        <EmptyState
          title="No tienes cuentas registradas"
          message="Una vez abras una cuenta en ventanilla con tu identificación, aparecerá aquí con su saldo disponible."
          icon="▤"
        />
      )}
      {(accounts.status === 'success' || accounts.status === 'empty') && accounts.data && accounts.data.length > 0 && (
        <>
          <DataTable columns={columns} rows={accounts.data} rowKey={(a) => a.accountNumber} />
          <section className="card section" aria-label="Detalle de saldo" style={{ marginTop: 'var(--space-4)' }}>
            <h2>Consultar saldo actualizado</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="account-select">Cuenta</label>
                <select
                  id="account-select"
                  value={selected ?? ''}
                  onChange={(e) => select(e.target.value)}
                >
                  <option value="">Selecciona una cuenta…</option>
                  {accounts.data.map((a) => (
                    <option key={a.accountNumber} value={a.accountNumber}>
                      {a.accountNumber} ({ACCOUNT_TYPE_LABELS[a.accountType] ?? a.accountType})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {selected && balance && (
              <div>
                <p>
                  <strong>Saldo disponible:</strong>{' '}
                  <MoneyAmount value={balance.value} currency={balance.currency} />
                </p>
                <Button variant="secondary" size="sm" onClick={() => void refreshBalance()} loading={refreshing} loadingLabel="Actualizando…">
                  Actualizar saldo
                </Button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
