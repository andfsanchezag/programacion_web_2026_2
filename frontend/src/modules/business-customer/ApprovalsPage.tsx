/** Aprobaciones empresa: approve/reject por código con confirmación y motivo. */
import { useState, type FormEvent } from 'react';
import { useSession } from '../../application/session/SessionProvider';
import { presentError } from '../../adapters/alerts/alertAdapter';
import { Button, EmptyState, Input } from '../../components';
import { TransferCard } from '../../components/ProductCards';
import type { TransferSummary } from '../../domain/models';

export function BusinessApprovalsPage() {
  const { services } = useSession();
  const [transferId, setTransferId] = useState('');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<TransferSummary | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const act = async (kind: 'approve' | 'reject', reason?: string): Promise<void> => {
    const id = transferId.trim();
    if (!id) {
      setFieldError('Ingresa el código de la transferencia (ej. TRF-…).');
      return;
    }
    setFieldError(null);
    if (kind === 'approve') {
      const ok = await services.alerts.confirmFinancialAction({
        title: 'Aprobar transferencia de la empresa',
        details: [{ label: 'Transferencia', value: id }],
        confirmLabel: 'Aprobar',
      });
      if (!ok) return;
    } else if (!reason || reason.trim().length < 1) {
      setFieldError('La razón del rechazo es obligatoria (1-500 caracteres).');
      return;
    }
    setPending(true);
    try {
      const updated =
        kind === 'approve'
          ? await services.transfers.approveTransfer(id, 'business-customer')
          : await services.transfers.rejectTransfer(id, { rejectionReason: reason!.trim() }, 'business-customer');
      setResult(updated);
      await services.alerts.showSuccess(
        `Transferencia ${updated.transferId}: ${updated.status === 'APPROVED' ? 'aprobada' : 'rechazada'}.`,
      );
    } catch (err) {
      await presentError(services.alerts, err);
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Aprobaciones de la empresa</h1>
      </div>
      <section className="card section" aria-label="Aprobar o rechazar">
        <h2>Aprobar / rechazar por código</h2>
        <p style={{ color: 'var(--color-ink-soft)' }}>
          La cola de pendientes pertenece al Supervisor. Aquí actúa cualquier transferencia
          de la empresa usando su código.
        </p>
        <div className="field">
          <label htmlFor="biz-trf">Código de transferencia</label>
          <input id="biz-trf" value={transferId} onChange={(e) => setTransferId(e.target.value)} placeholder="TRF-…" disabled={pending} />
        </div>
        {fieldError && (
          <div className="alert alert-error" role="alert">
            <span aria-hidden="true">✕</span>
            <div className="alert-body">{fieldError}</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Button onClick={() => void act('approve')} loading={pending}>
            Aprobar
          </Button>
          <RejectWithReason pending={pending} onReject={(reason) => void act('reject', reason)} />
        </div>
        {result && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <TransferCard transfer={result} />
          </div>
        )}
      </section>
      <EmptyState
        title="Sin lista de pendientes para este rol"
        message="La cola de transferencias pendientes vive en el módulo de Supervisor. Aquí puedes aprobar o rechazar cualquier transferencia de la empresa con su código."
        icon="◷"
      />
    </div>
  );
}

function RejectWithReason({ pending, onReject }: { pending: boolean; onReject: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  const [openForm, setOpenForm] = useState(false);
  return (
    <>
      <Button variant="danger" disabled={pending} onClick={() => setOpenForm((v) => !v)}>
        Rechazar
      </Button>
      {openForm && (
        <form
          style={{ width: '100%' }}
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            onReject(reason);
          }}
        >
          <Input label="Motivo del rechazo" value={reason} onChange={(e) => setReason(e.target.value)} required disabled={pending} />
          <Button type="submit" variant="danger" loading={pending} loadingLabel="Rechazando…">
            Confirmar rechazo
          </Button>
        </form>
      )}
    </>
  );
}
