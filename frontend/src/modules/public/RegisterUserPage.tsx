/** Registro de usuario de acceso — POST /auth/register/user (público). */

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../../application/session/SessionProvider';
import { presentError } from '../../adapters/alerts/alertAdapter';
import { Button, Input, Select } from '../../components';

interface Errors {
  customerIdentification?: string;
  username?: string;
  password?: string;
  role?: string;
}

const ROLE_OPTIONS = [
  { value: 'NATURAL_CUSTOMER', label: 'Cliente natural' },
  { value: 'BUSINESS_CUSTOMER', label: 'Cliente empresa' },
] as const;

function validate(v: Record<string, string>): Errors {
  const e: Errors = {};
  if (v.customerIdentification.trim().length < 1 || v.customerIdentification.trim().length > 30) {
    e.customerIdentification = 'Identificación inválida.';
  }
  if (v.username.trim().length < 3 || v.username.trim().length > 40 || /\s/.test(v.username)) {
    e.username = 'Usuario: 3-40 caracteres sin espacios.';
  }
  if (v.password.length < 8 || v.password.length > 100) {
    e.password = 'Contraseña: 8-100 caracteres.';
  }
  if (!v.role) e.role = 'Selecciona un tipo de usuario.';
  return e;
}

export function RegisterUserPage() {
  const { services } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customerIdentification: '',
    username: '',
    password: '',
    role: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const local = validate(form);
    setErrors(local);
    if (Object.keys(local).length > 0) return;
    setPending(true);
    try {
      await services.auth.registerCustomerUser({
        customerIdentification: form.customerIdentification.trim(),
        username: form.username.trim(),
        password: form.password,
        role: form.role,
      });
      await services.alerts.showSuccess('Usuario de acceso creado. Ya puedes iniciar sesión.');
      navigate('/login', { replace: true });
    } catch (err) {
      await presentError(services.alerts, err);
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
        <h1>Tu usuario de acceso</h1>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <h1>Crear usuario</h1>
          <form onSubmit={(e) => void onSubmit(e)} noValidate>
            <Input
              label="Identificación del cliente o empresa"
              required
              value={form.customerIdentification}
              onChange={set('customerIdentification')}
              error={errors.customerIdentification}
              disabled={pending}
            />
            <Input
              label="Usuario"
              required
              autoComplete="username"
              value={form.username}
              onChange={set('username')}
              error={errors.username}
              disabled={pending}
            />
            <Input
              label="Contraseña"
              type="password"
              required
              autoComplete="new-password"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              hint="8 a 100 caracteres"
              disabled={pending}
            />
            <Select
              label="Tipo de usuario"
              required
              options={ROLE_OPTIONS}
              placeholder="Selecciona…"
              value={form.role}
              onChange={set('role')}
              error={errors.role}
              disabled={pending}
            />
            <Button type="submit" block loading={pending} loadingLabel="Creando usuario…">
              Crear usuario
            </Button>
          </form>
          <div className="auth-links">
            <Link to="/login">Volver a iniciar sesión</Link>
            <Link to="/register/natural-customer">Aún no soy cliente: registrarme</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
