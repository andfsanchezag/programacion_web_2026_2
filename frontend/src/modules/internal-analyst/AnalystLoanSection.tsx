/**
 * Gestión de créditos (analista): aprobar/rechazar/desembolsar/cerrar con
 * identificación directa y confirmaciones SweetAlert (nunca prompt/confirm
 * nativos). Sin lookup previo: el backend no expone detalle de crédito para
 * INTERNAL_ANALYST (GET natural daría 403); el 200 de cada acción devuelve
 * el LoanSummary actualizado.
 */
import { useState } from 'react';
import { useSession } from '../../application/session/SessionProvider';
import { presentError } from '../../adapters/alerts/alertAdapter';
import { Button, Input } from '../../components';
import { LoanCard } from '../../components/ProductCards';
import type { LoanSummary } from '../../domain/models';

export function LoanManagementSection() {
  const { services } = useSession();
  const [loanId, setLoanId] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [result, setResult] = useState<LoanSummary | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const requireId = (): string | null => {
    const id = loanId.trim();
    if (!id) {
      setFormError('Ingresa el código del crédito.');
      return null;
    }
    setFormError(null);
    return id;
  };

  const approve = async (): Promise<void> => {
    const id = requireId();
    if (!id) return;
    const amount = Number(approvedAmount);
    const rate = Number(interestRate);
    if (!approvedAmount || !Number.isFinite(amount) || amount <= 0) {
      setFormError('Monto aprobado mayor que cero.');
      return;
    }
    if (!interestRate || !Number.isFinite(rate) || rate <= 0) {
      setFormError('Tasa de interés mayor que cero.');
      return;
    }
    const ok = await services.alerts.confirmFinancialAction({
      title: 'Aprobar crédito',
      details: [
        { label: 'Crédito', value: id },
        { label: 'Monto aprobado', value: `$ ${amount.toLocaleString('es-CO')}` },
        { label: 'Tasa', value: `${rate}%` },
      ],
      confirmLabel: 'Aprobar',
    });
    if (!ok) return;
    setPending(true);
    try {
      const updated = await services.loans.approveLoan(id, { approvedAmount: amount, interestRate: rate });
      setResult(updated);
      await services.alerts.showSuccess(`Crédito ${updated.loanId} aprobado (${updated.status}).`);
    } catch (err) {
      setResult(null);
      await presentError(services.alerts, err);
    } finally {
      setPending(false);
    }
  };

  const act = async (
    action: 'reject' | 'disburse' | 'close',
    title: string,
    confirmLabel: string,
  ): Promise<void> => {
    const id = requireId();
    if (!id) return;
    const ok = await services.alerts.confirmFinancialAction({
      title,
      details: [{ label: 'Crédito', value: id }],
      confirmLabel,
      danger: true,
    });
    if (!ok) return;
    setPending(true);
    try {
      if (action === 'reject') {
        const updated = await services.loans.rejectLoan(id);
        setResult(updated);
        await services.alerts.showSuccess(`Crédito ${updated.loanId} rechazado.`);
      } else if (action === 'disburse') {
        const updated = await services.loans.disburseLoan(id);
        setResult(updated);
        await services.alerts.showSuccess(`Crédito ${updated.loanId} desembolsado.`);
      } else {
        await services.loans.closeLoan(id);
        setResult(null);
        await services.alerts.showSuccess(`Crédito ${id} cerrado.`);
      }
    } catch (err) {
      if (action !== 'close') setResult(null);
      await presentError(services.alerts, err);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="card section" aria-label="Gestión de créditos">
      <h2>Gestión de créditos (analista)</h2>
      <div className="form-grid">
        <Input label="Código del crédito" required value={loanId} onChange={(e) => setLoanId(e.target.value)} disabled={pending} />
        <Input label="Monto aprobado (para aprobar)" type="number" min="1" step="any" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} disabled={pending} />
        <Input label="Tasa de interés % (para aprobar)" type="number" min="0" step="any" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} disabled={pending} />
      </div>
      {formError && <div className="alert alert-error" role="alert">{formError}</div>}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
        <Button size="sm" loading={pending} onClick={() => void approve()}>Aprobar</Button>
        <Button size="sm" variant="danger" loading={pending} onClick={() => void act('reject', 'Rechazar crédito', 'Rechazar')}>Rechazar</Button>
        <Button size="sm" variant="danger" loading={pending} onClick={() => void act('disburse', 'Desembolsar crédito', 'Desembolsar')}>Desembolsar</Button>
        <Button size="sm" variant="secondary" loading={pending} onClick={() => void act('close', 'Cerrar crédito', 'Cerrar')}>Cerrar</Button>
      </div>
      {result && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <LoanCard loan={result} lastUpdate={new Date().toLocaleString('es-CO')} />
        </div>
      )}
    </section>
  );
}
