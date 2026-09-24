/** Operador: cuentas de la empresa + transferencias de alto valor (§F5). */
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../application/session/SessionProvider';
import { useAsyncResource } from '../../application/viewModels/useAsyncResource';
import { Button, DataTable, EmptyState, type Column } from '../../components';
import { MoneyAmount } from '../../components/MoneyAmount';
import { StatusBadge } from '../../components/StatusBadge';
import type { BankAccountSummary } from '../../domain/models';

export function OperatorDashboard() {
  const { services, session } = useSession();
  const navigate = useNavigate();
  const accounts = useAsyncResource(() => services.accounts.getCompanyAccounts());

  const columns: Array<Column<BankAccountSummary>> = [
    { key: 'n', header: 'Número', render: (a) => a.accountNumber },
    { key: 'type', header: 'Tipo', render: (a) => (a.accountType === 'SAVINGS' ? 'Ahorros' : 'Corriente') },
    { key: 'owner', header: 'Empresa', render: (a) => a.ownerIdentification },
    { key: 'balance', header: 'Saldo', render: (a) => <MoneyAmount value={a.availableBalance} currency={a.currency} />, numeric: true },
    { key: 'status', header: 'Estado', render: (a) => <StatusBadge kind="account" status={a.status} /> },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Cuentas de la empresa</h1>
          <p style={{ color: 'var(--color-ink-soft)' }}>
            Hola, {session?.user.username}. Las transferencias de alto valor quedan en espera de aprobación.
          </p>
        </div>
        <Button onClick={() => navigate('/business/operator/transfers')}>Nueva transferencia</Button>
      </div>
      <DataTable
        columns={columns}
        rows={accounts.data ?? []}
        rowKey={(a) => a.accountNumber}
        loading={accounts.status === 'loading'}
        error={accounts.error}
        onRetry={accounts.reload}
        emptyTitle="Sin cuentas de empresa"
        emptyMessage="Cuando la empresa tenga cuentas operativas aparecerán aquí para originar transferencias."
        caption={accounts.data && accounts.data.length > 0 ? `${accounts.data.length} cuentas` : undefined}
      />
      {(accounts.status === 'success' || accounts.status === 'empty') && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <EmptyState
            title="Historial de operaciones"
            message="El historial de operaciones existe para clientes naturales y bitácora de auditoría; para este rol usa transferencias recientes creadas en esta sesión."
            icon="◷"
          />
        </div>
      )}
    </div>
  );
}
