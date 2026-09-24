/** Formulario de solicitud de crédito comercial. */
import { useState, type FormEvent } from 'react';
import { useSession } from '../../application/session/SessionProvider';
import { presentError } from '../../adapters/alerts/alertAdapter';
import { Button, Input, Select } from '../../components';
import { LoanCard } from '../../components/ProductCards';
import { LOAN_TYPE_LABELS, type LoanType } from '../../domain/enums';
import type { LoanSummary } from '../../domain/models';

const LOAN_TYPE_OPTIONS = (Object.keys(LOAN_TYPE_LABELS) as LoanType[]).map((value) => ({ value, label: LOAN_TYPE_LABELS[value] }));

interface FormErrors {
  loanType?: string;
  requestedAmount?: string;
  termInMonths?: string;
  destinationAccountNumber?: string;
}

export function CommercialLoanForm({ customerIdentification }: { customerIdentification: string }) {
  const { services } = useSession();
  // Sin endpoint de consulta para COMMERCIAL (REPAIR_BACKEND): la identificación
  // y la cuenta destino se ingresan directamente; el backend valida existencia
  // (404) y elegibilidad al solicitar.
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
    if (!form.destinationAccountNumber.trim()) e.destinationAccountNumber = 'Ingresa la cuenta destino del cliente.';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const onRequest = async (ev: FormEvent): Promise<void> => {
    ev.preventDefault();
    if (!validate()) return;
    const amount = Number(form.requestedAmount);
    const confirmed = await services.alerts.confirmFinancialAction({
      title: 'Solicitar crédito para el cliente',
      details: [
        { label: 'Cliente', value: customerIdentification },
        { label: 'Tipo', value: form.loanType },
        { label: 'Monto', value: `$ ${amount.toLocaleString('es-CO')}` },
        { label: 'Plazo', value: `${form.termInMonths} meses` },
        { label: 'Cuenta destino', value: form.destinationAccountNumber.trim() },
      ],
      confirmLabel: 'Solicitar crédito',
    });
    if (!confirmed) return;
    setPending(true);
    try {
      const loan = await services.loans.requestLoanForCustomer({
        customerIdentification,
        loanType: form.loanType,
        requestedAmount: amount,
        termInMonths: Number(form.termInMonths),
        destinationAccountNumber: form.destinationAccountNumber.trim(),
      });
      setCreated(loan);
      await services.alerts.showSuccess(`Crédito ${loan.loanId} solicitado para ${customerIdentification}. Estado: ${loan.status}.`);
    } catch (err) {
      await presentError(services.alerts, err);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="card section" aria-label="Solicitar crédito para el cliente">
      <div className="section-head">
        <h2>Nueva solicitud para {customerIdentification}</h2>
      </div>
      <form onSubmit={(e) => void onRequest(e)} noValidate>
        <div className="form-grid">
          <Select label="Tipo de crédito" required options={LOAN_TYPE_OPTIONS} placeholder="Selecciona…" value={form.loanType} onChange={set('loanType')} error={fieldErrors.loanType} disabled={pending} />
          <Input label="Monto solicitado" type="number" min="1" step="any" required value={form.requestedAmount} onChange={set('requestedAmount')} error={fieldErrors.requestedAmount} disabled={pending} />
          <Input label="Plazo (meses)" type="number" min="1" step="1" required value={form.termInMonths} onChange={set('termInMonths')} error={fieldErrors.termInMonths} disabled={pending} />
          <Input label="Cuenta destino del cliente" required value={form.destinationAccountNumber} onChange={set('destinationAccountNumber')} error={fieldErrors.destinationAccountNumber} disabled={pending} />
        </div>
        <Button type="submit" loading={pending} loadingLabel="Enviando solicitud…">Revisar y solicitar</Button>
      </form>
      {created && <LoanCard loan={created} lastUpdate={new Date().toLocaleString('es-CO')} />}
    </section>
  );
}