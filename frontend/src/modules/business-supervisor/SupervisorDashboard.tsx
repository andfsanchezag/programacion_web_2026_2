/** Supervisor: cola de pendientes + aprobar/rechazar con confirmación (§F5). */
import { useState, type FormEvent } from 'react';
import { useSession } from '../../application/session/SessionProvider';
import { useAsyncResource } from '../../application/viewModels/useAsyncResource';
import { presentError } from '../../adapters/alerts/alertAdapter';
import { Button, EmptyState, Input } from '../../components';
import { TransferCard } from '../../components/ProductCards';
import type { TransferSummary } from '../../domain/models';

export function SupervisorDashboard() {
  const { services, session } = useSession();
  const queue = useAsyncResource(() => services.transfers.getPendingTransfers());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);

  const approve = async (transfer: TransferSummary): Promise<void> => {
    const ok = await services.alerts.confirmFinancialAction({
      title: 'Aprobar transferencia pendiente',
      details: [
        { label: 'Transferencia', value: transfer.transferId },
        { label: 'Origen', value: transfer.sourceAccountNumber },
        { label: 'Destino', value: transfer.destinationAccountNumber },
        { label: 'Monto', value: `$ ${transfer.amount.toLocaleString('es-CO')}` },
      ],
      confirmLabel: 'Aprobar transferencia',
    });
    if (!ok) return;
    setPendingId(transfer.transferId);
    try {
      const updated = await services.transfers.approveTransfer(transfer.transferId, 'business-supervisor');
      await services.alerts.showSuccess(`Transferencia ${updated.transferId} aprobada (${updated.status}).`);
      queue.reload();
    } catch (err) {
      await presentError(services.alerts, err);
    } finally {
      setPendingId(null);
    }
  };

  const reject = async (transferId: string, reason: string): Promise<void> => {
    if (reason.trim().length < 1 || reason.trim().length > 500) return;
    setPendingId(transferId);
    try {
      const updated = await services.transfers.rejectTransfer(transferId, { rejectionReason: reason.trim() }, 'business-supervisor');
      await services.alerts.showSuccess(`Transferencia ${updated.transferId} rechazada.`);
      setRejectFor(null);
      queue.reload();
    } catch (err) {
      await presentError(services.alerts, err);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Cola de aprobación</h1>
          <p style={{ color: 'var(--color-ink-soft)' }}>
            Hola, {session?.user.username}. Las transferencias aprobadas se distinguen de las pendientes.
          </p>
        </div>
        <Button variant="secondary" onClick={queue.reload} loading={queue.status === 'loading'}>
          Actualizar cola
        </Button>
      </div>

      {queue.status === 'loading' && (
        <div role="status" aria-live="polite" aria-label="Cargando cola de aprobación">
          <div className="skeleton" style={{ height: 120 }} />
          <div style={{ height: 16 }} />
          <div className="skeleton" style={{ height: 120 }} />
        </div>
      )}
      {queue.status === 'error' && queue.error && (
        <div className="error-box" role="alert">
          <div className="error-title">No pudimos cargar la cola</div>
          <div>{queue.error.message}</div>
          {queue.error.code && <div className="error-support">Código: {queue.error.code}</div>}
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Button variant="secondary" size="sm" onClick={queue.reload}>
              Reintentar
            </Button>
          </div>
        </div>
      )}
      {(queue.status === 'success' || queue.status === 'empty') && (queue.data?.length ?? 0) === 0 && (
        <EmptyState
          title="Sin transferencias pendientes"
          message="Cuando un operador cree una transferencia de alto valor aparecerá aquí para su revisión."
          icon="✓"
        />
      )}
      {(queue.data ?? []).map((t) => (
        <section key={t.transferId} aria-label={`Pendiente ${t.transferId}`}>
          <TransferCard
            transfer={t}
            actions={
              rejectFor === t.transferId ? (
                <RejectInline
                  pending={pendingId === t.transferId}
                  onCancel={() => setRejectFor(null)}
                  onConfirm={(reason) => void reject(t.transferId, reason)}
                />
              ) : (
                <>
                  <Button size="sm" loading={pendingId === t.transferId} onClick={() => void approve(t)}>
                    Aprobar
                  </Button>
                  <Button size="sm" variant="danger" disabled={pendingId === t.transferId} onClick={() => setRejectFor(t.transferId)}>
                    Rechazar
                  </Button>
                </>
              )
            }
          />
        </section>
      ))}
    </div>
  );
}
function RejectInline({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (reason.trim().length < 1 || reason.trim().length > 500) {
      setFieldError('El motivo es obligatorio (1-500 caracteres).');
      return;
    }
    onConfirm(reason);
  };
  return (
    <form style={{ width: '100%' }} onSubmit={submit} noValidate>
      <Input label="Motivo del rechazo" value={reason} onChange={(e) => setReason(e.target.value)} required disabled={pending} />
      {fieldError && (
        <div className="field-error" role="alert" style={{ marginBottom: 'var(--space-2)' }}>
          {fieldError}
        </div>
      )}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <Button type="submit" size="sm" variant="danger" loading={pending} loadingLabel="Rechazando…">
          Confirmar rechazo
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
