/** Sección: Gestión de créditos (analista) - aprobar/rechazar/desembolsar/cerrar. */
import { useState } from 'react';
import { useSession } from '../../application/session/SessionProvider';
import { presentError } from '../../adapters/alerts/alertAdapter';
import { Button } from '../../components';
import { StatusBadge } from '../../components/StatusBadge';
import { MoneyAmount } from '../../components/MoneyAmount';
import type { LoanSummary } from '../../domain/models';

export function LoanManagementSection() {
  const { services } = useSession();
  const [loanId, setLoanId] = useState('');
  const [loan, setLoan] = useState<LoanSummary | null>(null);
  const [loanPending, setLoanPending] = useState(false);
  const [approvePending, setApprovePending] = useState(false);
  const [disbursePending, setDisbursePending] = useState(false);
  const [closePending, setClosePending] = useState(false);

  const lookup = async (): Promise<void> => {
    if (!loanId.trim()) return;
    setLoanPending(true);
    try { setLoan(await services.loans.getLoan(loanId.trim())); }
    catch (err) { setLoan(null); }
    finally { setLoanPending(false); }
  };

  const approve = async (): Promise<void> => {
    if (!loan) return;
    const amount = Number(prompt(`Monto aprobado para ${loan.loanId} (≤ ${loan.requestedAmount}):`));
    const rate = Number(prompt('Tasa de interés (ej. 1.45):'));
    if (!Number.isFinite(amount) || amount <= 0 || amount > loan.requestedAmount || !Number.isFinite(rate) || rate <= 0) return;
    setApprovePending(true);
    try { const updated = await services.loans.approveLoan(loan.loanId, { approvedAmount: amount, interestRate: rate }); setLoan(updated); await services.alerts.showSuccess(`Crédito ${updated.loanId} aprobado (${updated.status}).`); }
    catch (err) { await presentError(services.alerts, err); }
    finally { setApprovePending(false); }
  };

  const disburse = async (): Promise<void> => {
    if (!loan) return;
    const ok = await services.alerts.confirmFinancialAction({ title: 'Desembolsar crédito', details: [{ label: 'Crédito', value: loan.loanId }, { label: 'Monto aprobado', value: `$ ${(loan.approvedAmount ?? loan.requestedAmount).toLocaleString('es-CO')}` }], confirmLabel: 'Desembolsar', danger: true });
    if (!ok) return;
    setDisbursePending(true);
    try { const updated = await services.loans.disburseLoan(loan.loanId); setLoan(updated); await services.alerts.showSuccess(`Crédito ${updated.loanId} desembolsado.`); }
    catch (err) { await presentError(services.alerts, err); }
    finally { setDisbursePending(false); }
  };

  const close = async (): Promise<void> => {
    if (!loan) return;
    const ok = await services.alerts.confirmFinancialAction({ title: 'Cerrar crédito', details: [{ label: 'Crédito', value: loan.loanId }, { label: 'Estado actual', value: loan.status }], confirmLabel: 'Cerrar', danger: true });
    if (!ok) return;
    setClosePending(true);
    try { await services.loans.closeLoan(loan.loanId); await services.alerts.showSuccess('Crédito cerrado.'); setLoan(null); setLoanId(''); }
    catch (err) { await presentError(services.alerts, err); }
    finally { setClosePending(false); }
  };

  return (
    <section className="card section" aria-label="Gestión de créditos">
      <h2>Gestión de créditos (analista)</h2>
      <div className="field">
        <label htmlFor="analyst-loan">Código del crédito</label>
        <input id="analyst-loan" value={loanId} onChange={(e) => setLoanId(e.target.value)} placeholder="LOAN-…" disabled={loanPending} />
        <Button onClick={lookup} loading={loanPending} loadingLabel="Consultando…" disabled={loanPending}>Consultar</Button>
      </div>
      {loan && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <p><strong>{loan.loanId}</strong> · {loan.loanType} · <MoneyAmount value={loan.requestedAmount} /> · {loan.termInMonths} meses</p>
          <StatusBadge kind="loan" status={loan.status} />
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
            {loan.status === 'UNDER_REVIEW' && <Button loading={approvePending} onClick={approve}>Aprobar</Button>}
            {loan.status === 'UNDER_REVIEW' && (
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm('¿Rechazar este crédito?')) {
                    services.loans.rejectLoan(loan.loanId).then((r) => {
                      services.alerts.showSuccess(`Crédito ${r.loanId} rechazado.`);
                    });
                  }
                }}
              >
                Rechazar
              </Button>
            )}
            {loan.status === 'APPROVED' && <Button variant="danger" loading={disbursePending} onClick={disburse}>Desembolsar</Button>}
            {loan.status === 'DISBURSED' && <Button variant="secondary" loading={closePending} onClick={close}>Cerrar</Button>}
          </div>
        </div>
      )}
    </section>
  );
}