/** Analista interno — registro empleados, estado clientes, crédito (aprobar/rechazar/desembolsar/cerrar), auditoría. */
import { DashboardCard } from '../../components';
import { EmployeeRegistrationSection } from './AnalystEmployeeSection';
import { CustomerStatusSection } from './AnalystCustomerStatusSection';
import { LoanManagementSection } from './AnalystLoanSection';
import { AuditLogsSection } from './AnalystAuditSection';

export function AnalystDashboard() {
  return (
    <div>
      <div className="page-head">
        <h1>Panel de analista</h1>
      </div>

      <section className="section" aria-label="Registro de empleados">
        <DashboardCard title="Registrar empleado" actionLabel="Ir a registro" onAction={() => {}} lastUpdate={new Date().toLocaleString('es-CO')}>
          <p style={{ margin: 0, color: 'var(--color-ink-soft)' }}>Crea usuarios con roles operativos (cajeros, comerciales, operadores, supervisores, analistas).</p>
        </DashboardCard>
      </section>

      <EmployeeRegistrationSection />
      <CustomerStatusSection />
      <LoanManagementSection />
      <AuditLogsSection />
    </div>
  );
}