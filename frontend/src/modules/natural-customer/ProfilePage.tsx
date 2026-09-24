/** Mi perfil — GET + PUT /natural-customer/profile. */
import { useState, type FormEvent } from 'react';
import { useSession } from '../../application/session/SessionProvider';
import { useAsyncResource } from '../../application/viewModels/useAsyncResource';
import { presentError } from '../../adapters/alerts/alertAdapter';
import { Button, ErrorState, Input, Skeleton } from '../../components';
import { StatusBadge } from '../../components/StatusBadge';

export function CustomerProfilePage() {
  const { services } = useSession();
  const profile = useAsyncResource(() => services.customers.getMyProfile());

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const startEdit = (): void => {
    setEmail(profile.data?.email ?? '');
    setPhone('');
    setAddress('');
    setFieldError(null);
    setEditing(true);
  };

  const onSave = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!email && !phone && !address) {
      setFieldError('Ingresa al menos un campo para actualizar.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError('Correo electrónico inválido.');
      return;
    }
    if (phone && !/^\+?\d{7,15}$/.test(phone.trim())) {
      setFieldError('Teléfono: 7-15 dígitos.');
      return;
    }
    setFieldError(null);
    setPending(true);
    try {
      const payload: { email?: string; phoneNumber?: string; address?: string } = {};
      if (email) payload.email = email.trim();
      if (phone) payload.phoneNumber = phone.trim();
      if (address) payload.address = address.trim();
      await services.customers.updateMyProfile(payload);
      await services.alerts.showSuccess('Perfil actualizado correctamente.');
      setEditing(false);
      profile.reload();
    } catch (err) {
      await presentError(services.alerts, err); // 400/409 conservan el formulario
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Mi perfil</h1>
          <p style={{ color: 'var(--color-ink-soft)' }}>Datos de registro y estado de tu cuenta.</p>
        </div>
        {!editing && profile.status === 'success' && (
          <Button variant="secondary" onClick={startEdit}>
            Editar datos
          </Button>
        )}
      </div>

      {profile.status === 'loading' && (
        <div className="card" role="status" aria-live="polite" aria-label="Cargando perfil">
          <Skeleton height={22} width="50%" />
          <div style={{ height: 12 }} />
          <Skeleton height={16} />
          <div style={{ height: 8 }} />
          <Skeleton height={16} width="70%" />
        </div>
      )}
      {profile.status === 'error' && profile.error && (
        <ErrorState error={profile.error} onRetry={profile.reload} title="No pudimos cargar tu perfil" />
      )}
      {profile.status === 'success' && profile.data && !editing && (
        <section className="card" aria-label="Datos del cliente">
          <h2>{profile.data.name}</h2>
          <p><strong>Identificación:</strong> {profile.data.identification}</p>
          <p><strong>Correo:</strong> {profile.data.email}</p>
          <p><strong>Tipo:</strong> {profile.data.customerType === 'NATURAL' ? 'Persona natural' : 'Empresa'}</p>
          <StatusBadge kind="customer" status={profile.data.status} />
        </section>
      )}
      {editing && (
        <section className="card page-enter" aria-label="Editar perfil">
          <h2>Actualizar datos de contacto</h2>
          <form onSubmit={(e) => void onSave(e)} noValidate>
            <Input label="Correo electrónico" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={pending} />
            <Input label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} hint="7-15 dígitos" disabled={pending} />
            <Input label="Dirección" value={address} onChange={(e) => setAddress(e.target.value)} disabled={pending} />
            {fieldError && (
              <div className="alert alert-error" role="alert">
                <span aria-hidden="true">✕</span>
                <div className="alert-body">{fieldError}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <Button type="submit" loading={pending} loadingLabel="Guardando…">
                Guardar cambios
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={pending}>
                Cancelar
              </Button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
