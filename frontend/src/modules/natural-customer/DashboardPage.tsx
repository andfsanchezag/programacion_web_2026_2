/**
 * Dashboard cliente natural — perfil, cuentas, créditos, operaciones.
 * Widgets resilientes: cada uno carga con su propio estado/retry (§3).
 */

import { useNavigate } from 'react-router-dom';
import { useSession } from '../../application/session/SessionProvider';
import { useAsyncResource } from '../../application/viewModels/useAsyncResource';
import { Button, DashboardCard, EmptyState, ErrorState, SkeletonCard } from '../../components';
import { MoneyAmount } from '../../components/MoneyAmount';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable, type Column } from '../../components/DataTable';
import type { OperationSummary } from '../../domain/models';

const OP_COLUMNS: Array<Column<OperationSummary>> = [
  { key: 'type', header: 'Operación', render: (o) => o.operationType.replaceAll('_', ' ') },
  { key: 'date', header: 'Fecha', render: (o) => new Date(o.executionDate).toLocaleString('es-CO') },
  { key: 'product', header: 'Producto', render: (o) => o.affectedProduct },
  { key: 'by', header: 'Realizada por', render: (o) => o.performedBy },
];

export function NaturalCustomerDashboard() {
  const { services, session } = useSession();
  const navigate = useNavigate();

  const profile = useAsyncResource(() => services.customers.getMyProfile());
  const accounts = useAsyncResource(() => services.accounts.getMyAccounts());
  const mainAccount = accounts.data?.[0]?.accountNumber ?? '';
  const operations = useAsyncResource(
    () => services.audits.getMyOperations({ accountNumber: mainAccount }),
    { enabled: mainAccount !== '' },
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Hola, {profile.data?.name ?? session?.user.username ?? ''}</h1>
          <p style={{ color: 'var(--color-ink-soft)' }}>Resumen de tus productos y actividad reciente.</p>
        </div>
        <Button onClick={() => navigate('/customer/transfers')}>Nueva transferencia</Button>
      </div>

      <section className="section" aria-label="Perfil">
        <DashboardCard
          title="Mi perfil"
          loading={profile.status === 'loading'}
          error={profile.error}
          onRetry={profile.reload}
          lastUpdate={new Date().toLocaleString('es-CO')}
          actionLabel="Editar perfil"
          onAction={() => navigate('/customer/profile')}
        >
          {profile.data && (
            <>
              <div>
                <strong>{profile.data.name}</strong> · {profile.data.identification}
              </div>
              <div className="card-meta">{profile.data.email}</div>
              <div style={{ marginTop: 'var(--space-2)' }}>
                <StatusBadge kind="customer" status={profile.data.status} />
              </div>
            </>
          )}
        </DashboardCard>
      </section>

      <section className="section" aria-label="Cuentas">
        <div className="section-head">
          <h2>Mis cuentas</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/customer/accounts')}>
            Ver detalle
          </Button>
        </div>
        {accounts.status === 'loading' && (
          <div className="cards-grid" role="status" aria-live="polite" aria-label="Cargando cuentas">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}
        {accounts.status === 'error' && accounts.error && (
          <ErrorState error={accounts.error} onRetry={accounts.reload} title="No pudimos cargar tus cuentas" />
        )}
        {accounts.status === 'empty' && (
          <EmptyState
            title="Aún no tienes cuentas"
            message="Abre tu primera cuenta en ventanilla con tu identificación."
            icon="▤"
          />
        )}
        {accounts.status === 'success' && accounts.data && (
          <div className="cards-grid">
            {accounts.data.map((acc) => (
              <DashboardCard
                key={acc.accountNumber}
                title={`${acc.accountType === 'SAVINGS' ? 'Ahorros' : 'Corriente'} · ${acc.accountNumber}`}
                status={<StatusBadge kind="account" status={acc.status} />}
                lastUpdate={new Date().toLocaleString('es-CO')}
                actionLabel="Ver saldos"
                onAction={() => navigate('/customer/accounts')}
                value={<MoneyAmount value={acc.availableBalance} currency={acc.currency} />}
              />
            ))}
          </div>
        )}
      </section>

      <section className="section" aria-label="Créditos">
        <div className="section-head">
          <h2>Mis créditos</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/customer/loans')}>
            Gestionar créditos
          </Button>
        </div>
        <DashboardCard
          title="Solicitar o consultar créditos"
          actionLabel="Ir a créditos"
          onAction={() => navigate('/customer/loans')}
          lastUpdate={new Date().toLocaleString('es-CO')}
        >
          <p style={{ margin: 0, color: 'var(--color-ink-soft)' }}>Consulta por código o solicita con confirmación previa.</p>
        </DashboardCard>
      </section>

      <section className="section" aria-label="Operaciones recientes">
        <div className="section-head">
          <h2>Operaciones recientes{mainAccount ? ` · ${mainAccount}` : ''}</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/customer/operations')}>
            Ver historial
          </Button>
        </div>
        <DataTable
          columns={OP_COLUMNS}
          rows={operations.data ?? []}
          rowKey={(o) => o.operationId}
          loading={operations.status === 'loading' || accounts.status === 'loading'}
          error={operations.error}
          onRetry={operations.reload}
          emptyTitle="Sin operaciones aún"
          emptyMessage="Tus movimientos aparecerán aquí."
        />
      </section>
    </div>
  );
}
