/**
 * AppRouter — rutas públicas y protegidas por rol (Frontend-Role-Modules.md).
 * Cada rama exige el SystemRole del backend; RequireRole redirige al
 * dashboard propio con alerta 403 si se navega directo a otro rol.
 */

import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthenticatedLayout } from './AuthenticatedLayout';
import { RequireAuth, RequireRole } from './guards/guards';
import { useSession } from '../application/session/SessionProvider';
import { ROLE_HOME } from '../domain/enums';
import { LoginPage } from '../modules/public/LoginPage';
import { RegisterNaturalCustomerPage } from '../modules/public/RegisterNaturalCustomerPage';
import { RegisterBusinessCustomerPage } from '../modules/public/RegisterBusinessCustomerPage';
import { RegisterUserPage } from '../modules/public/RegisterUserPage';
import { NaturalCustomerDashboard } from '../modules/natural-customer/DashboardPage';
import { CustomerProfilePage } from '../modules/natural-customer/ProfilePage';
import { CustomerAccountsPage } from '../modules/natural-customer/AccountsPage';
import { CustomerLoansPage } from '../modules/natural-customer/LoansPage';
import { CustomerTransfersPage } from '../modules/natural-customer/TransfersPage';
import { CustomerOperationsPage } from '../modules/natural-customer/OperationsPage';
import { BusinessDashboard } from '../modules/business-customer/DashboardPage';
import { BusinessApprovalsPage } from '../modules/business-customer/ApprovalsPage';
import { CompanyUsersPage } from '../modules/business-customer/UsersPage';
import { OperatorDashboard } from '../modules/business-operator/DashboardPage';
import { OperatorTransfersPage } from '../modules/business-operator/TransfersPage';
import { SupervisorDashboard } from '../modules/business-supervisor/SupervisorDashboard';
import { TellerDashboard } from '../modules/teller/TellerDashboard';
import { CommercialDashboard } from '../modules/commercial/CommercialDashboard';
import { AnalystDashboard } from '../modules/internal-analyst/AnalystDashboard';
function NotFound() {
  return (
    <div className="state-box" style={{ marginTop: 'var(--space-8)' }}>
      <div className="state-icon" aria-hidden="true">
        ◎
      </div>
      <h1>Página no encontrada</h1>
      <p>La ruta solicitada no existe. Usa la navegación para continuar.</p>
      <a href="/login" className="btn">
        Ir al inicio
      </a>
    </div>
  );
}

function SessionHomeRedirect() {
  const { session } = useSession();
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[session.user.role]} replace />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register/natural-customer" element={<RegisterNaturalCustomerPage />} />
      <Route path="/register/business-customer" element={<RegisterBusinessCustomerPage />} />
      <Route path="/register/user" element={<RegisterUserPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AuthenticatedLayout />}>
          <Route element={<RequireRole roles={['NATURAL_CUSTOMER']} />}>
            <Route path="/customer" element={<NaturalCustomerDashboard />} />
            <Route path="/customer/profile" element={<CustomerProfilePage />} />
            <Route path="/customer/accounts" element={<CustomerAccountsPage />} />
            <Route path="/customer/loans" element={<CustomerLoansPage />} />
            <Route path="/customer/transfers" element={<CustomerTransfersPage />} />
            <Route path="/customer/operations" element={<CustomerOperationsPage />} />
          </Route>

          <Route element={<RequireRole roles={['BUSINESS_CUSTOMER']} />}>
            <Route path="/business" element={<BusinessDashboard />} />
            <Route path="/business/users" element={<CompanyUsersPage />} />
            <Route path="/business/transfers" element={<BusinessApprovalsPage />} />
          </Route>

          <Route element={<RequireRole roles={['BUSINESS_OPERATOR']} />}>
            <Route path="/business/operator" element={<OperatorDashboard />} />
            <Route path="/business/operator/transfers" element={<OperatorTransfersPage />} />
          </Route>

          <Route element={<RequireRole roles={['BUSINESS_SUPERVISOR']} />}>
            <Route path="/business/supervisor" element={<SupervisorDashboard />} />
          </Route>

          <Route element={<RequireRole roles={['TELLER_EMPLOYEE']} />}>
            <Route path="/teller" element={<TellerDashboard />} />
            {/* Alias de la navegación (AuthenticatedLayout): ventanilla de una sola página. */}
            <Route path="/teller/accounts" element={<TellerDashboard />} />
          </Route>

          <Route element={<RequireRole roles={['COMMERCIAL_EMPLOYEE']} />}>
            <Route path="/commercial" element={<CommercialDashboard />} />
            {/* Alias de la navegación: comercial de una sola página. */}
            <Route path="/commercial/loans" element={<CommercialDashboard />} />
          </Route>

          <Route element={<RequireRole roles={['INTERNAL_ANALYST']} />}>
            <Route path="/analyst" element={<AnalystDashboard />} />
            {/* Aliases de la navegación: panel analista de una sola página con secciones. */}
            <Route path="/analyst/customers" element={<AnalystDashboard />} />
            <Route path="/analyst/loans" element={<AnalystDashboard />} />
            <Route path="/analyst/employees" element={<AnalystDashboard />} />
            <Route path="/analyst/audit" element={<AnalystDashboard />} />
          </Route>

          <Route path="/" element={<SessionHomeRedirect />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
