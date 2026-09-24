/** Créditos — solicitud con revisión→confirmación→resultado (§F6.1.4/9). */
import { useState, type FormEvent } from 'react';
import { useSession } from '../../application/session/SessionProvider';
import { useAsyncResource } from '../../application/viewModels/useAsyncResource';
import { presentError } from '../../adapters/alerts/alertAdapter';
import { Button, EmptyState, Input, Select } from '../../components';
import { LoanCard } from '../../components/ProductCards';
import { LOAN_TYPE_LABELS, type LoanType } from '../../domain/enums';
import type { LoanSummary } from '../../domain/models';

const LOAN_TYPE_OPTIONS = (Object.keys(LOAN_TYPE_LABELS) as LoanType[]).map((value) => ({
  value,
  label: LOAN_TYPE_LABELS[value],
}));

interface FormErrors {
  loanType?: string;
  requestedAmount?: string;
  termInMonths?: string;
  destinationAccountNumber?: string;
}

export function CustomerLoansPage() {
  const { services } = useSession();
  const accounts = useAsyncResource(() => services.accounts.getMyAccounts());
  const [form, setForm] = useState({ loanType: '', requestedAmount: '', termInMonths: '', destinationAccountNumber: '' });
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<LoanSummary | null>(null);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.loanType) e.loanType = 'Selecciona el tipo de crédito.';
    const amount = Number(form.requestedAmount);
    if (!form.requestedAmount || !Number.isFinite(amount) || amount <= 0) e.requestedAmount = 'Monto mayor que cero.';
    const term = Number(form.termInMonths);
    if (!form.termInMonths || !Number.isInteger(term) || term < 1) e.termInMonths = 'Plazo entero ≥ 1.';
    if (!form.destinationAccountNumber) e.destinationAccountNumber = 'Selecciona la cuenta destino.';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const onRequest = async (ev: FormEvent): Promise<void> => {
    ev.preventDefault();
    if (!validate()) return;
    const amount = Number(form.requestedAmount);
    const confirmed = await services.alerts.confirmFinancialAction({
      title: 'Confirmar solicitud de crédito',
      details: [
        { label: 'Tipo', value: LOAN_TYPE_LABELS[form.loanType as LoanType] ?? form.loanType },
        { label: 'Monto', value: `$ ${amount.toLocaleString('es-CO')}` },
        { label: 'Plazo', value: `${form.termInMonths} meses` },
        { label: 'Cuenta destino', value: form.destinationAccountNumber },
      ],
      confirmLabel: 'Solicitar crédito',
    });
    if (!confirmed) return;
    setPending(true);
    try {
      const loan = await services.loans.requestLoan({
        loanType: form.loanType,
        requestedAmount: amount,
        termInMonths: Number(form.termInMonths),
        destinationAccountNumber: form.destinationAccountNumber,
      });
      setCreated(loan);
      await services.alerts.showSuccess(`Crédito ${loan.loanId} creado en estado ${loan.status}.`);
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
          <h1>Créditos</h1>
          <p style={{ color: 'var(--color-ink-soft)' }}>Solicita, consulta y abona tus créditos.</p>
        </div>
      </div>

      <section className="card section" aria-label="Solicitar crédito">
        <h2>Solicitar crédito</h2>
        <form onSubmit={(e) => void onRequest(e)} noValidate>
          <div className="form-grid">
            <Select label="Tipo de crédito" required options={LOAN_TYPE_OPTIONS} placeholder="Selecciona…" value={form.loanType} onChange={set('loanType')} error={fieldErrors.loanType} disabled={pending} />
            <Input label="Monto solicitado" type="number" min="1" step="any" required value={form.requestedAmount} onChange={set('requestedAmount')} error={fieldErrors.requestedAmount} disabled={pending} />
            <Input label="Plazo (meses)" type="number" min="1" step="1" required value={form.termInMonths} onChange={set('termInMonths')} error={fieldErrors.termInMonths} disabled={pending} />
            <div className="field">
              <label htmlFor="loan-dest">Cuenta destino</label>
              <select id="loan-dest" value={form.destinationAccountNumber} onChange={set('destinationAccountNumber')} disabled={pending}>
                <option value="">Selecciona…</option>
                {(accounts.data ?? []).map((a) => (
                  <option key={a.accountNumber} value={a.accountNumber}>
                    {a.accountNumber}
                  </option>
                ))}
              </select>
              {fieldErrors.destinationAccountNumber && (
                <div className="field-error" role="alert">{fieldErrors.destinationAccountNumber}</div>
              )}
            </div>
          </div>
          <Button type="submit" loading={pending} loadingLabel="Enviando solicitud…">
            Revisar y solicitar
          </Button>
        </form>
      </section>

      {created && (
        <section aria-label="Resultado de la solicitud">
          <LoanCard loan={created} lastUpdate={new Date().toLocaleString('es-CO')} />
        </section>
      )}

      <LoanLookupSection />
      <LoanPaymentSection accounts={(accounts.data ?? []).map((a) => a.accountNumber)} />
    </div>
  );
}


function LoanLookupSection() {
  const { services } = useSession();
  const [loanId, setLoanId] = useState('');
  const [loan, setLoan] = useState<LoanSummary | null>(null);
  const [pending, setPending] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const lookup = async (): Promise<void> => {
    if (!loanId.trim()) {
      setFieldError('Ingresa el código del crédito.');
      return;
    }
    setFieldError(null);
    setPending(true);
    try {
      setLoan(await services.loans.getLoan(loanId.trim()));
    } catch (err) {
      setLoan(null);
      await presentError(services.alerts, err);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="card section" aria-label="Consultar crédito">
      <h2>Consultar crédito por código</h2>
      <div className="form-grid">
        <Input label="Código del crédito" value={loanId} onChange={(e) => setLoanId(e.target.value)} placeholder="LOAN-…" disabled={pending} />
      </div>
      {fieldError && (
        <div className="alert alert-error" role="alert">
          <span aria-hidden="true">✕</span>
          <div className="alert-body">{fieldError}</div>
        </div>
      )}
      <Button onClick={() => void lookup()} loading={pending} loadingLabel="Consultando…">
        Consultar
      </Button>
      {!loan && !pending && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <EmptyState
            title="Sin préstamo seleccionado"
            message="Ingresa el código que recibiste al solicitarlo para ver su estado, montos y plazo."
            icon="▤"
          />
        </div>
      )}
      {loan && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <LoanCard loan={loan} />
        </div>
      )}
    </section>
  );
}

function LoanPaymentSection({ accounts }: { accounts: string[] }) {
  const { services } = useSession();
  const [form, setForm] = useState({ loanId: '', sourceAccountNumber: '', amount: '' });
  const [pending, setPending] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onPay = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.loanId.trim() || !form.sourceAccountNumber || !Number.isFinite(amount) || amount <= 0) {
      setFieldError('Completa crédito, cuenta origen y un monto mayor que cero.');
      return;
    }
    setFieldError(null);
    const confirmed = await services.alerts.confirmFinancialAction({
      title: 'Confirmar abono al crédito',
      details: [
        { label: 'Crédito', value: form.loanId.trim() },
        { label: 'Cuenta origen', value: form.sourceAccountNumber },
        { label: 'Monto', value: `$ ${amount.toLocaleString('es-CO')}` },
      ],
      confirmLabel: 'Abonar',
    });
    if (!confirmed) return;
    setPending(true);
    try {
      const result = await services.loans.registerPayment(form.loanId.trim(), {
        sourceAccountNumber: form.sourceAccountNumber,
        amount,
      });
      await services.alerts.showSuccess(`Abono registrado en ${result.loanId}. Estado: ${result.status}.`);
      setForm({ loanId: '', sourceAccountNumber: '', amount: '' });
    } catch (err) {
      await presentError(services.alerts, err);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="card" aria-label="Abonar a crédito">
      <h2>Abonar a un crédito</h2>
      <form onSubmit={(e) => void onPay(e)} noValidate>
        <div className="form-grid">
          <Input label="Código del crédito" required value={form.loanId} onChange={set('loanId')} disabled={pending} />
          <div className="field">
            <label htmlFor="pay-source">Cuenta origen</label>
            <select id="pay-source" value={form.sourceAccountNumber} onChange={set('sourceAccountNumber')} disabled={pending}>
              <option value="">Selecciona…</option>
              {accounts.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <Input label="Monto" type="number" min="1" step="any" required value={form.amount} onChange={set('amount')} disabled={pending} />
        </div>
        {fieldError && (
          <div className="alert alert-error" role="alert">
            <span aria-hidden="true">✕</span>
            <div className="alert-body">{fieldError}</div>
          </div>
        )}
        <Button type="submit" loading={pending} loadingLabel="Registrando abono…">
          Confirmar y abonar
        </Button>
      </form>
    </section>
  );
}
