/** Panel empresa — perfil, usuarios delegados, aprobación por código + nota. */
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../application/session/SessionProvider';
import { useAsyncResource } from '../../application/viewModels/useAsyncResource';
import { Button, DashboardCard, EmptyState, ErrorState, SkeletonCard } from '../../components';
import { StatusBadge } from '../../components/StatusBadge';

export function BusinessDashboard() {
  const { services } = useSession();
  const navigate = useNavigate();
  const profile = useAsyncResource(() => services.customers.getCompanyProfile());

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{profile.data?.name ?? 'Panel de empresa'}</h1>
          <p style={{ color: 'var(--color-ink-soft)' }}>
            Perfil de la compañía, usuarios delegados y aprobación de transferencias.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/business/users')}>
          Registrar usuario delegado
        </Button>
      </div>

      <section className="section" aria-label="Perfil de la empresa">
        {profile.status === 'loading' && <SkeletonCard />}
        {profile.status === 'error' && profile.error && (
          <ErrorState error={profile.error} onRetry={profile.reload} title="No pudimos cargar el perfil" />
        )}
        {profile.status === 'success' && profile.data && (
          <DashboardCard
            title={`${profile.data.name} · ${profile.data.identification}`}
            status={<StatusBadge kind="customer" status={profile.data.status} />}
            lastUpdate={new Date().toLocaleString('es-CO')}
            actionLabel="Registrar usuario delegado"
            onAction={() => navigate('/business/users')}
          >
            <div className="card-meta">{profile.data.email}</div>
            {profile.data.legalRepresentative && (
              <div className="card-meta">
                Representante legal: {profile.data.legalRepresentative.name}{' '}
                ({profile.data.legalRepresentative.identification})
              </div>
            )}
            <p style={{ margin: '8px 0 0', color: 'var(--color-ink-soft)' }}>
              La consulta de cuentas y productos de la empresa está disponible para el rol
              Operador; la cola de pendientes, para el rol Supervisor.
            </p>
          </DashboardCard>
        )}
      </section>

      <div style={{ marginTop: 'var(--space-6)' }}>
        <EmptyState
          title="Aprobación por código de transferencia"
          message="Ve a la sección Aprobaciones para aprobar o rechazar una transferencia de la empresa usando su código TRF-…"
          actionLabel="Ir a aprobaciones"
          onAction={() => navigate('/business/transfers')}
        />
      </div>
    </div>
  );
}
