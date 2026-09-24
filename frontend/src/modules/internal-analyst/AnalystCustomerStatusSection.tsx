/** Sección: Cambiar estado de cliente (analista). */
import { useState } from 'react';
import { useSession } from '../../application/session/SessionProvider';
import { presentError } from '../../adapters/alerts/alertAdapter';
import { Button } from '../../components';
import type { CustomerSummary } from '../../domain/models';

export function CustomerStatusSection() {
  const { services } = useSession();
  const [identification, setIdentification] = useState('');
  const [updated, setUpdated] = useState<CustomerSummary | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // REPAIR_BACKEND pendiente: el backend no expone búsqueda de clientes para
  // INTERNAL_ANALYST (sólo PATCH .../status). Se opera con identificación
  // directa; el backend valida existencia (404) y el 200 devuelve el estado.
  const changeStatus = async (status: string): Promise<void> => {
    const id = identification.trim();
    if (!id) { setFormError('Ingresa la identificación del cliente.'); return; }
    setFormError(null);
    const ok = await services.alerts.confirmFinancialAction({ title: `Cambiar estado a ${status}`, details: [{ label: 'Cliente', value: id }, { label: 'Nuevo estado', value: status }], confirmLabel: 'Cambiar estado', danger: status === 'BLOCKED' });
    if (!ok) return;
    setPending(true);
    try {
      const result = await services.customers.changeCustomerStatus(id, { status });
      setUpdated(result);
      await services.alerts.showSuccess(`Estado del cliente cambiado a ${result.status}.`);
    } catch (err) { setUpdated(null); await presentError(services.alerts, err); }
    finally { setPending(false); }
  };

  return (
    <section className="card section" aria-label="Estado de clientes">
      <h2>Cambiar estado de cliente</h2>
      <div className="field">
        <label htmlFor="analyst-cust">Identificación</label>
        <input id="analyst-cust" value={identification} onChange={(e) => setIdentification(e.target.value)} placeholder="Identificación" disabled={pending} />
      </div>
      {formError && <div className="alert alert-error" role="alert">{formError}</div>}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
        <Button size="sm" loading={pending} onClick={() => void changeStatus('ACTIVE')}>Activar</Button>
        <Button size="sm" variant="secondary" loading={pending} onClick={() => void changeStatus('INACTIVE')}>Inactivar</Button>
        <Button size="sm" variant="danger" loading={pending} onClick={() => void changeStatus('BLOCKED')}>Bloquear</Button>
      </div>
      {updated && (
        <p className="card-meta" role="status" style={{ marginTop: 'var(--space-3)' }}>
          {updated.name} · {updated.identification} · estado actual: {updated.status}
        </p>
      )}
    </section>
  );
}