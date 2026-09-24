/** Registro de cliente natural — POST /auth/register/natural-customer (público). */

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../../application/session/SessionProvider';
import { presentError } from '../../adapters/alerts/alertAdapter';
import { Button, Input } from '../../components';

interface Errors {
  identification?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  birthDate?: string;
}

function validate(v: Record<string, string>): Errors {
  const e: Errors = {};
  if (!/^[0-9][0-9.\-]{0,29}$/.test(v.identification.trim())) e.identification = 'Identificación inválida (1-30 caracteres).';
  if (v.name.trim().length < 1 || v.name.trim().length > 120) e.name = 'Nombre requerido (máx. 120).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = 'Correo electrónico inválido.';
  if (!/^\+?\d{7,15}$/.test(v.phoneNumber.trim())) e.phoneNumber = 'Teléfono: 7-15 dígitos.';
  if (v.address.trim().length < 1 || v.address.trim().length > 200) e.address = 'Dirección requerida (máx. 200).';
  if (!v.birthDate) e.birthDate = 'Fecha de nacimiento requerida.';
  else if (new Date(v.birthDate) >= new Date()) e.birthDate = 'La fecha debe ser en el pasado.';
  return e;
}

export function RegisterNaturalCustomerPage() {
  const { services } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    identification: '',
    name: '',
    email: '',
    phoneNumber: '',
    address: '',
    birthDate: '',
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
      await services.auth.registerNaturalCustomer({
        identification: form.identification.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        address: form.address.trim(),
        birthDate: form.birthDate,
      });
      await services.alerts.showSuccess('Cliente natural registrado. Ya puedes crear tu usuario de acceso.');
      navigate('/register/user', { replace: true });
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
        <h1>Abre tu cuenta personal</h1>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <h1>Registro de cliente natural</h1>
          <form onSubmit={(e) => void onSubmit(e)} noValidate>
            <div className="form-grid">
              <Input label="Identificación" required value={form.identification} onChange={set('identification')} error={errors.identification} disabled={pending} />
              <Input label="Nombre completo" required value={form.name} onChange={set('name')} error={errors.name} disabled={pending} />
              <Input label="Correo electrónico" type="email" required value={form.email} onChange={set('email')} error={errors.email} disabled={pending} />
              <Input label="Teléfono" required value={form.phoneNumber} onChange={set('phoneNumber')} error={errors.phoneNumber} hint="7-15 dígitos" disabled={pending} />
              <Input label="Dirección" required value={form.address} onChange={set('address')} error={errors.address} className="span-2" disabled={pending} />
              <Input label="Fecha de nacimiento" type="date" required value={form.birthDate} onChange={set('birthDate')} error={errors.birthDate} disabled={pending} />
            </div>
            <Button type="submit" block loading={pending} loadingLabel="Registrando…">
              Registrarme
            </Button>
          </form>
          <div className="auth-links">
            <Link to="/login">Volver a iniciar sesión</Link>
            <Link to="/register/user">Ya tengo cliente: crear usuario</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
