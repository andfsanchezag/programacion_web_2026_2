/** Usuarios delegados de empresa — POST /business-customer/users (§5.2). */
import { useState, type FormEvent } from 'react';
import { useSession } from '../../application/session/SessionProvider';
import { presentError } from '../../adapters/alerts/alertAdapter';
import { Button, Input, Select } from '../../components';

const ROLE_OPTIONS = [
  { value: 'BUSINESS_OPERATOR', label: 'Operador de empresa' },
  { value: 'BUSINESS_SUPERVISOR', label: 'Supervisor de empresa' },
] as const;

interface Errors {
  username?: string;
  password?: string;
  role?: string;
  email?: string;
  identification?: string;
  name?: string;
}

function validate(v: Record<string, string>): Errors {
  const e: Errors = {};
  if (v.username.trim().length < 3 || v.username.trim().length > 40 || /\s/.test(v.username)) e.username = 'Usuario: 3-40 sin espacios.';
  if (v.password.length < 8 || v.password.length > 100) e.password = 'Contraseña: 8-100 caracteres.';
  if (!v.role) e.role = 'Selecciona el rol delegado.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = 'Correo inválido.';
  if (v.identification.trim().length < 1 || v.identification.trim().length > 30) e.identification = 'Identificación inválida.';
  if (v.name.trim().length < 1 || v.name.trim().length > 120) e.name = 'Nombre requerido.';
  return e;
}

export function CompanyUsersPage() {
  const { services } = useSession();
  const [form, setForm] = useState({ username: '', password: '', role: '', email: '', identification: '', name: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const local = validate(form);
    setErrors(local);
    if (Object.keys(local).length > 0) return;
    const ok = await services.alerts.confirmFinancialAction({
      title: 'Crear usuario delegado',
      details: [
        { label: 'Usuario', value: form.username.trim() },
        { label: 'Rol', value: form.role },
        { label: 'Empresa', value: 'tu compañía (se adhiere automáticamente)' },
      ],
      confirmLabel: 'Crear usuario',
    });
    if (!ok) return;
    setPending(true);
    try {
      const created = await services.auth.registerCompanyUser({
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        email: form.email.trim(),
        identification: form.identification.trim(),
        name: form.name.trim(),
      });
      await services.alerts.showSuccess(`Usuario delegado ${created.username} creado (${created.role}).`);
      setForm({ username: '', password: '', role: '', email: '', identification: '', name: '' });
    } catch (err) {
      await presentError(services.alerts, err);
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Usuarios delegados</h1>
          <p style={{ color: 'var(--color-ink-soft)' }}>Se adhieren automáticamente a tu empresa.</p>
        </div>
      </div>
      <section className="card" aria-label="Registrar usuario delegado">
        <h2>Nuevo usuario delegado</h2>
        <form onSubmit={(e) => void onSubmit(e)} noValidate>
          <div className="form-grid">
            <Input label="Usuario" required value={form.username} onChange={set('username')} error={errors.username} disabled={pending} />
            <Input label="Contraseña" type="password" required autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} disabled={pending} />
            <Select label="Rol delegado" required options={ROLE_OPTIONS} placeholder="Selecciona…" value={form.role} onChange={set('role')} error={errors.role} disabled={pending} />
            <Input label="Correo" type="email" required value={form.email} onChange={set('email')} error={errors.email} disabled={pending} />
            <Input label="Identificación" required value={form.identification} onChange={set('identification')} error={errors.identification} disabled={pending} />
            <Input label="Nombre completo" required value={form.name} onChange={set('name')} error={errors.name} disabled={pending} />
          </div>
          <Button type="submit" loading={pending} loadingLabel="Creando usuario…">
            Revisar y registrar
          </Button>
        </form>
      </section>
    </div>
  );
}
