/** Transferencias cliente natural — validar→revisar→confirmar→resultado (§F6.1.4/9). */
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

export function CustomerTransfersPage() {
  const { services } = useSession();
  const accounts = useAsyncResource(() => services.accounts.getMyAccounts());
  const [form, setForm] = useState({ sourceAccountNumber: '', destinationAccountNumber: '', amount: '', description: '' });
  const [fieldErrors, setFieldErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<TransferSummary | null>(null);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.sourceAccountNumber) e.sourceAccountNumber = 'Selecciona la cuenta origen.';
    if (!form.destinationAccountNumber.trim()) e.destinationAccountNumber = 'Ingresa la cuenta destino.';
    else if (form.destinationAccountNumber.trim() === form.sourceAccountNumber) {
      e.destinationAccountNumber = 'El destino debe ser distinto del origen.';
    }
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
      title: 'Revisar y confirmar transferencia',
      details: [
        { label: 'Cuenta origen', value: form.sourceAccountNumber },
        { label: 'Cuenta destino', value: form.destinationAccountNumber.trim() },
        { label: 'Monto', value: `$ ${amount.toLocaleString('es-CO')}` },
        ...(form.description ? [{ label: 'Descripción', value: form.description }] : []),
      ],
      confirmLabel: 'Enviar transferencia',
    });
    if (!confirmed) return;
    setPending(true);
    try {
      const transfer = await services.transfers.createNaturalTransfer({
        sourceAccountNumber: form.sourceAccountNumber,
        destinationAccountNumber: form.destinationAccountNumber.trim(),
        amount,
        description: form.description.trim() || undefined,
      });
      setResult(transfer);
      if (transfer.status === 'WAITING_FOR_APPROVAL') {
        await services.alerts.showSuccess(
          `Transferencia ${transfer.transferId} creada y pendiente de aprobación (monto alto).`,
        );
      } else {
        await services.alerts.showSuccess(`Transferencia ${transfer.transferId} ejecutada.`);
      }
    } catch (err) {
      await presentError(services.alerts, err); // 409 conserva los datos del formulario
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Transferencias</h1>
          <p style={{ color: 'var(--color-ink-soft)' }}>Montos altos pueden quedar pendientes de aprobación.</p>
        </div>
      </div>
      <section className="card section" aria-label="Nueva transferencia">
        <h2>Nueva transferencia</h2>
        <form onSubmit={(e) => void onSubmit(e)} noValidate>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="tr-source">Cuenta origen</label>
              <select id="tr-source" value={form.sourceAccountNumber} onChange={set('sourceAccountNumber')} disabled={pending}>
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
          <Button type="submit" loading={pending} loadingLabel="Enviando…">
            Revisar y confirmar
          </Button>
        </form>
      </section>
      {result && (
        <section aria-label="Resultado de la transferencia">
          <TransferCard transfer={result} />
        </section>
      )}
    </div>
  );
}
