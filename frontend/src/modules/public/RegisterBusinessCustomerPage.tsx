/** Registro de empresa — POST /auth/register/business-customer (público). */

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
  legalRepresentativeIdentification?: string;
}

function validate(v: Record<string, string>): Errors {
  const e: Errors = {};
  if (v.identification.trim().length < 1 || v.identification.trim().length > 30) e.identification = 'NIT inválido (1-30 caracteres).';
  if (v.name.trim().length < 1 || v.name.trim().length > 120) e.name = 'Razón social requerida.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = 'Correo electrónico inválido.';
  if (!/^\+?\d{7,15}$/.test(v.phoneNumber.trim())) e.phoneNumber = 'Teléfono: 7-15 dígitos.';
  if (v.address.trim().length < 1 || v.address.trim().length > 200) e.address = 'Dirección requerida.';
  if (!/^[0-9][0-9.\-]{0,29}$/.test(v.legalRepresentativeIdentification.trim())) {
    e.legalRepresentativeIdentification = 'Identificación del representante inválida.';
  }
  return e;
}

export function RegisterBusinessCustomerPage() {
  const { services } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    identification: '',
    name: '',
    email: '',
    phoneNumber: '',
    address: '',
    legalRepresentativeIdentification: '',
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
      await services.auth.registerBusinessCustomer({
        identification: form.identification.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        address: form.address.trim(),
        legalRepresentativeIdentification: form.legalRepresentativeIdentification.trim(),
      });
      await services.alerts.showSuccess(
        'Empresa registrada. El representante legal debe tener una cuenta personal para crear usuarios de acceso.',
      );
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
        <h1>Banca empresarial</h1>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <h1>Registro de empresa</h1>
          <form onSubmit={(e) => void onSubmit(e)} noValidate>
            <div className="form-grid">
              <Input label="NIT de la empresa" required value={form.identification} onChange={set('identification')} error={errors.identification} disabled={pending} />
              <Input label="Razón social" required value={form.name} onChange={set('name')} error={errors.name} disabled={pending} />
              <Input label="Correo corporativo" type="email" required value={form.email} onChange={set('email')} error={errors.email} disabled={pending} />
              <Input label="Teléfono" required value={form.phoneNumber} onChange={set('phoneNumber')} error={errors.phoneNumber} disabled={pending} />
              <Input label="Dirección" required value={form.address} onChange={set('address')} error={errors.address} className="span-2" disabled={pending} />
              <Input
                label="Identificación del representante legal"
                required
                value={form.legalRepresentativeIdentification}
                onChange={set('legalRepresentativeIdentification')}
                error={errors.legalRepresentativeIdentification}
                hint="Debe ser un cliente natural ya registrado"
                className="span-2"
                disabled={pending}
              />
            </div>
            <Button type="submit" block loading={pending} loadingLabel="Registrando…">
              Registrar empresa
            </Button>
          </form>
          <div className="auth-links">
            <Link to="/login">Volver a iniciar sesión</Link>
            <Link to="/register/natural-customer">Registrar primero al representante legal</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
