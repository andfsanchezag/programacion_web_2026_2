/** Secciones del analista: registro de empleados. */
import { useState, type FormEvent } from 'react';
import { useSession } from '../../application/session/SessionProvider';
import { presentError } from '../../adapters/alerts/alertAdapter';
import { Button, Input, Select } from '../../components';

const EMPLOYEE_ROLES = [
  { value: 'TELLER_EMPLOYEE', label: 'Cajero de ventanilla' },
  { value: 'COMMERCIAL_EMPLOYEE', label: 'Ejecutivo comercial' },
  { value: 'BUSINESS_OPERATOR', label: 'Operador de empresa' },
  { value: 'BUSINESS_SUPERVISOR', label: 'Supervisor de empresa' },
  { value: 'INTERNAL_ANALYST', label: 'Analista interno' },
] as const;

export function EmployeeRegistrationSection() {
  const { services } = useSession();
  const [form, setForm] = useState({ username: '', password: '', role: '', email: '', identification: '', name: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<{ userId: string; username: string; role: string; status: string } | null>(null);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (form.username.trim().length < 3 || form.username.trim().length > 40 || /\s/.test(form.username)) e.username = 'Usuario: 3-40 sin espacios.';
    if (form.password.length < 8 || form.password.length > 100) e.password = 'Contraseña: 8-100 caracteres.';
    if (!form.role) e.role = 'Selecciona rol.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Correo inválido.';
    if (form.identification.trim().length < 1 || form.identification.trim().length > 30) e.identification = 'Identificación inválida.';
    if (form.name.trim().length < 1 || form.name.trim().length > 120) e.name = 'Nombre requerido.';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent): Promise<void> => {
    ev.preventDefault(); if (!validate()) return;
    const ok = await services.alerts.confirmFinancialAction({ title: 'Registrar empleado', details: [{ label: 'Usuario', value: form.username.trim() }, { label: 'Rol', value: form.role }, { label: 'Empresa', value: 'N/A (empleado interno)' }], confirmLabel: 'Crear empleado' });
    if (!ok) return;
    setPending(true);
    try {
      const createdUser = await services.auth.registerEmployeeUser({ username: form.username.trim(), password: form.password, role: form.role, email: form.email.trim(), identification: form.identification.trim(), name: form.name.trim() });
      setCreated(createdUser);
      await services.alerts.showSuccess(`Empleado ${createdUser.username} creado con rol ${createdUser.role}.`);
      setForm({ username: '', password: '', role: '', email: '', identification: '', name: '' });
    } catch (err) { await presentError(services.alerts, err); }
    finally { setPending(false); }
  };

  return (
    <section className="card section" aria-label="Registrar empleado">
      <h2>Registrar empleado interno</h2>
      <form onSubmit={(e) => void onSubmit(e)} noValidate>
        <div className="form-grid">
          <Input label="Usuario" required value={form.username} onChange={set('username')} error={fieldErrors.username} disabled={pending} />
          <Input label="Contraseña" type="password" required autoComplete="new-password" value={form.password} onChange={set('password')} error={fieldErrors.password} disabled={pending} />
          <Select label="Rol" required options={EMPLOYEE_ROLES} placeholder="Selecciona…" value={form.role} onChange={set('role')} error={fieldErrors.role} disabled={pending} />
          <Input label="Correo" type="email" required value={form.email} onChange={set('email')} error={fieldErrors.email} disabled={pending} />
          <Input label="Identificación" required value={form.identification} onChange={set('identification')} error={fieldErrors.identification} disabled={pending} />
          <Input label="Nombre completo" required value={form.name} onChange={set('name')} error={fieldErrors.name} disabled={pending} />
        </div>
        <Button type="submit" loading={pending} loadingLabel="Creando empleado…">Registrar empleado</Button>
      </form>
      {created && <p style={{ marginTop: 'var(--space-3)', color: 'var(--color-success)' }}>Empleado {created.username} creado ({created.role}).</p>}
    </section>
  );
}