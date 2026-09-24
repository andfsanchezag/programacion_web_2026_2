/** Transferencia operador: validar→revisar→confirmar; resultado WAITING (§6.1). */
import { useState, type FormEvent } from 'react';
import { useSession } from '../../application/session/SessionProvider';
import { useAsyncResource } from '../../application/viewModels/useAsyncResource';
import { presentError } from '../../adapters/alerts/alertAdapter';
import { Button, Input } from '../../components';
import { TransferCard } from '../../components/ProductCards';
import type { TransferSummary } from '../../domain/models';

interface Errors {
  sourceAccountNumber?: string;
  destinationAccountNumber?: string;
  amount?: string;
  description?: string;
}

export function OperatorTransfersPage() {
  const { services } = useSession();
  const accounts = useAsyncResource(() => services.accounts.getCompanyAccounts());
  const [form, setForm] = useState({ sourceAccountNumber: '', destinationAccountNumber: '', amount: '', description: '' });
  const [fieldErrors, setFieldErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<TransferSummary | null>(null);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.sourceAccountNumber) e.sourceAccountNumber = 'Selecciona la cuenta origen de la empresa.';
    if (!form.destinationAccountNumber.trim()) e.destinationAccountNumber = 'Ingresa la cuenta destino.';
    const amount = Number(form.amount);
    if (!form.amount || !Number.isFinite(amount) || amount <= 0) e.amount = 'Monto mayor que cero.';
    if (form.description.length > 280) e.description = 'Máximo 280 caracteres.';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent): Promise<void> => {
    ev.preventDefault();
    if (!validate()) return;
    const amount = Number(form.amount);
    const confirmed = await services.alerts.confirmFinancialAction({
      title: 'Revisar transferencia de la empresa',
      details: [
        { label: 'Origen', value: form.sourceAccountNumber },
        { label: 'Destino', value: form.destinationAccountNumber.trim() },
        { label: 'Monto', value: `$ ${amount.toLocaleString('es-CO')}` },
        ...(form.description ? [{ label: 'Descripción', value: form.description }] : []),
      ],
      confirmLabel: 'Crear transferencia',
    });
    if (!confirmed) return;
    setPending(true);
    try {
      const transfer = await services.transfers.createBusinessTransfer({
        sourceAccountNumber: form.sourceAccountNumber,
        destinationAccountNumber: form.destinationAccountNumber.trim(),
        amount,
        description: form.description.trim() || undefined,
      });
      setResult(transfer);
      await services.alerts.showSuccess(
        `Transferencia ${transfer.transferId} creada con estado ${transfer.status}. Quedó en espera de aprobación.`,
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
        <h1>Nueva transferencia de empresa</h1>
      </div>
      <section className="card section" aria-label="Transferencia de alto valor">
        <form onSubmit={(e) => void onSubmit(e)} noValidate>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="op-source">Cuenta origen (empresa)</label>
              <select id="op-source" value={form.sourceAccountNumber} onChange={set('sourceAccountNumber')} disabled={pending}>
                <option value="">Selecciona…</option>
                {(accounts.data ?? []).map((a) => (
                  <option key={a.accountNumber} value={a.accountNumber}>
                    {a.accountNumber} — saldo {a.availableBalance.toLocaleString('es-CO')}
                  </option>
                ))}
              </select>
              {fieldErrors.sourceAccountNumber && (
                <div className="field-error" role="alert">{fieldErrors.sourceAccountNumber}</div>
              )}
            </div>
            <Input label="Cuenta destino" required value={form.destinationAccountNumber} onChange={set('destinationAccountNumber')} error={fieldErrors.destinationAccountNumber} disabled={pending} />
            <Input label="Monto" type="number" min="1" step="any" required value={form.amount} onChange={set('amount')} error={fieldErrors.amount} disabled={pending} />
            <Input label="Descripción (opcional)" value={form.description} onChange={set('description')} error={fieldErrors.description} disabled={pending} />
          </div>
          <Button type="submit" loading={pending} loadingLabel="Creando…">
            Revisar y confirmar
          </Button>
        </form>
      </section>
      {result && (
        <section aria-label="Resultado">
          <TransferCard transfer={result} />
        </section>
      )}
    </div>
  );
}
