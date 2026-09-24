/**
 * AuthenticatedLayout — shell persistente por rol (§F6.1.7):
 * navegación, ruta activa, título de página, menú móvil y logout.
 */

import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../application/session/SessionProvider';
import { ROLE_LABELS, type SystemRole } from '../domain/enums';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const NAV_BY_ROLE: Record<SystemRole, NavItem[]> = {
  NATURAL_CUSTOMER: [
    { to: '/customer', label: 'Resumen', end: true },
    { to: '/customer/accounts', label: 'Cuentas' },
    { to: '/customer/loans', label: 'Créditos' },
    { to: '/customer/transfers', label: 'Transferencias' },
    { to: '/customer/operations', label: 'Operaciones' },
    { to: '/customer/profile', label: 'Mi perfil' },
  ],
  BUSINESS_CUSTOMER: [
    { to: '/business', label: 'Resumen empresa', end: true },
    { to: '/business/users', label: 'Usuarios delegados' },
    { to: '/business/transfers', label: 'Aprobaciones' },
  ],
  BUSINESS_OPERATOR: [
    { to: '/business/operator', label: 'Cuentas de empresa', end: true },
    { to: '/business/operator/transfers', label: 'Nueva transferencia' },
  ],
  BUSINESS_SUPERVISOR: [
    { to: '/business/supervisor', label: 'Cola de aprobación', end: true },
  ],
  TELLER_EMPLOYEE: [
    { to: '/teller', label: 'Consulta de clientes', end: true },
    { to: '/teller/accounts', label: 'Gestión de cuentas' },
  ],
  COMMERCIAL_EMPLOYEE: [
    { to: '/commercial', label: 'Consulta de clientes', end: true },
    { to: '/commercial/loans', label: 'Solicitud de crédito' },
  ],
  INTERNAL_ANALYST: [
    { to: '/analyst', label: 'Resumen', end: true },
    { to: '/analyst/customers', label: 'Estado de clientes' },
    { to: '/analyst/loans', label: 'Créditos' },
    { to: '/analyst/employees', label: 'Registro de empleados' },
    { to: '/analyst/audit', label: 'Auditoría' },
  ],
};

export function AuthenticatedLayout() {
  const { session, signOut } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!session) return null;
  const nav = NAV_BY_ROLE[session.user.role];

  const current = [...nav]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)));

  const onLogout = async (): Promise<void> => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink to="/" className="brand">
          <span className="brand-dot" aria-hidden="true" />
          Aurora Banco
        </NavLink>
        <div className="header-user">
          <span className="who">
            <span>{session.user.username}</span>
            <span className="role">{ROLE_LABELS[session.user.role]}</span>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm nav-toggle"
            style={{ color: '#fff', borderColor: '#5f6368' }}
            aria-expanded={menuOpen}
            aria-controls="app-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? 'Cerrar menú' : 'Menú'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void onLogout()}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <nav id="app-nav" className={`app-nav ${menuOpen ? 'open' : ''}`} aria-label="Navegación principal">
        <ul>
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end ?? false}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="app-main page-enter" key={location.pathname}>
        <div className="breadcrumb">
          {ROLE_LABELS[session.user.role]} / {current?.label ?? 'Inicio'}
        </div>
        <Outlet />
      </main>
    </div>
  );
}
