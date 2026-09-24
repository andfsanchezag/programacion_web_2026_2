/**
 * Guards de rol (Frontend-Role-Modules.md §9):
 * - RequireAuth: sin sesión → /login conservando el destino.
 * - RequireRole: rol distinto → alerta 403 + retorno al dashboard propio.
 * La autorización real sigue siendo del backend (UI guard es sólo UX).
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useSession } from '../../application/session/SessionProvider';
import { presentError } from '../../adapters/alerts/alertAdapter';
import { ROLE_HOME, type SystemRole } from '../../domain/enums';

export function RequireAuth() {
  const { session } = useSession();
  const location = useLocation();
  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}

export function RequireRole({ roles }: { roles: readonly SystemRole[] }) {
  const { session, services } = useSession();
  const location = useLocation();

  const allowed = session !== null && roles.includes(session.user.role);

  useEffect(() => {
    if (session && !allowed) {
      void presentError(services.alerts, {
        status: 403,
        code: 'FORBIDDEN',
        message: 'No tienes permiso para acceder a esta sección.',
      });
    }
  }, [session, allowed, services]);

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!allowed) {
    return <Navigate to={ROLE_HOME[session.user.role]} replace />;
  }
  return <Outlet />;
}
