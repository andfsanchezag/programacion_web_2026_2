/**
 * LoginPage — F4 + §F6.1.1/2:
 * validación local username/password, estado loading, transición corta al
 * dashboard del rol, recuperación clara de 401 (username preservado).
 */

import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../../application/session/SessionProvider';
import { presentError } from '../../adapters/alerts/alertAdapter';
import { ROLE_HOME } from '../../domain/enums';
import { Button } from '../../components';
import { Input } from '../../components/Input';

interface FieldErrors {
  username?: string;
  password?: string;
}

function validate(username: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (username.trim().length < 3 || username.trim().length > 40) {
    errors.username = 'El usuario debe tener entre 3 y 40 caracteres.';
  }
  if (password.length < 8 || password.length > 100) {
    errors.password = 'La contraseña debe tener entre 8 y 100 caracteres.';
  }
  return errors;
}

export function LoginPage() {
  const { services, signIn, expiredNotice, clearExpiredNotice } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const localErrors = validate(username, password);
    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    setPending(true);
    try {
      const session = await services.auth.login(username.trim(), password);
      signIn(session);
      // §F6.1.2: transición corta, nunca pantalla en blanco.
      setTransitioning(true);
      const destination = from ?? ROLE_HOME[session.user.role];
      window.setTimeout(() => {
        navigate(destination, { replace: true });
      }, 650);
    } catch (err) {
      // 401 de login: alerta de autenticación; username se conserva.
      await presentError(services.alerts, err);
      setPassword('');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-brand" aria-hidden="true">
        <div className="brand-mark">
          <span className="brand-dot" /> Aurora Banco
        </div>
        <h1>Tu banca, clara y segura</h1>
        <p style={{ color: '#d9dde2', maxWidth: 420 }}>
          Administra tus cuentas, créditos y transferencias con confirmaciones explícitas y
          estados visibles en cada operación.
        </p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="mobile-brand">
            <span className="brand-dot" style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-brand)', display: 'inline-block' }} />{' '}
            Aurora Banco
          </div>
          <h1>Iniciar sesión</h1>
          {expiredNotice && (
            <div className="alert alert-warning" role="status">
              <span aria-hidden="true">⚠</span>
              <div className="alert-body">
                <strong>Sesión finalizada</strong>
                <div>{expiredNotice}</div>
              </div>
            </div>
          )}
          <form onSubmit={(e) => void onSubmit(e)} noValidate>
            <Input
              label="Usuario"
              name="username"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={errors.username}
              disabled={pending || transitioning}
            />
            <Input
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              disabled={pending || transitioning}
            />
            <Button type="submit" block loading={pending} loadingLabel="Verificando credenciales…">
              Entrar
            </Button>
          </form>
          <div className="auth-links">
            <Link to="/register/natural-customer" onClick={clearExpiredNotice}>
              Crear cuenta personal
            </Link>
            <Link to="/register/business-customer" onClick={clearExpiredNotice}>
              Registrar empresa
            </Link>
            <Link to="/register/user" onClick={clearExpiredNotice}>
              Crear usuario de acceso
            </Link>
          </div>
        </div>
      </section>

      {transitioning && (
        <div className="login-transition" role="status" aria-live="polite">
          <span className="spinner" style={{ width: 34, height: 34, borderWidth: 3 }} aria-hidden="true" />
          <strong>Bienvenido, {sessionName(username)}</strong>
          <span>Preparando tu panel…</span>
        </div>
      )}
    </div>
  );
}

function sessionName(username: string): string {
  return username.trim();
}
