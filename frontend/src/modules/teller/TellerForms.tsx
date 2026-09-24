/** Formularios de ventanilla: depósito, retiro, bloqueo/desbloqueo/cierre. */
import { useState, type FormEvent } from 'react';
import { useSession } from '../../application/session/SessionProvider';
import { presentError } from '../../adapters/alerts/alertAdapter';
import { Button, Input } from '../../components';

export function DepositForm({ accountNumber }: { accountNumber: string }) {
  const { services } = useSession();
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!amount || !Number.isFinite(amountNum) || amountNum <= 0) return;
    const ok = await services.alerts.confirmFinancialAction({
      title: 'Confirmar depósito',
      details: [{ label: 'Cuenta', value: accountNumber }, { label: 'Monto', value: `$ ${amountNum.toLocaleString('es-CO')}` }, { label: 'Referencia', value: reference || '—' }],
      confirmLabel: 'Depositar',
    });
    if (!ok) return;
    setPending(true);
    try {
      await services.accounts.deposit(accountNumber, { amount: amountNum, reference: reference || undefined });
      await services.alerts.showSuccess('Depósito registrado.');
      setAmount(''); setReference('');
    } catch (err) { await presentError(services.alerts, err); }
    finally { setPending(false); }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <Input label="Monto" type="number" min="1" step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} disabled={pending} style={{ width: 140 }} />
      <Input label="Referencia" value={reference} onChange={(e) => setReference(e.target.value)} disabled={pending} style={{ width: 200 }} />
      <Button type="submit" size="sm" loading={pending} loadingLabel="Deposita…">Depositar</Button>
    </form>
  );
}

export function WithdrawalForm({ accountNumber }: { accountNumber: string }) {
  const { services } = useSession();
  const [amount, setAmount] = useState('');
  const [clientId, setClientId] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!amount || !Number.isFinite(amountNum) || amountNum <= 0) return;
    const ok = await services.alerts.confirmFinancialAction({
      title: 'Confirmar retiro',
      details: [{ label: 'Cuenta', value: accountNumber }, { label: 'Monto', value: `$ ${amountNum.toLocaleString('es-CO')}` }],
      confirmLabel: 'Retirar',
      danger: true,
    });
    if (!ok) return;
    setPending(true);
    try {
      await services.accounts.withdraw(accountNumber, { amount: amountNum, clientIdentification: clientId.trim() || undefined });
      await services.alerts.showSuccess('Retiro registrado.');
      setAmount(''); setClientId('');
    } catch (err) { await presentError(services.alerts, err); }
    finally { setPending(false); }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <Input label="Monto" type="number" min="1" step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} disabled={pending} style={{ width: 140 }} />
      <Input label="Identificación del cliente (opcional)" value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={pending} style={{ width: 200 }} />
      <Button type="submit" size="sm" variant="danger" loading={pending} loadingLabel="Retira…">Retirar</Button>
    </form>
  );
}

export function BlockUnblockClose({ accountNumber }: { accountNumber: string }) {
  const { services } = useSession();
  const [pending, setPending] = useState(false);

  const doAction = async (action: 'block' | 'unblock' | 'close', label: string, danger = false): Promise<void> => {
    const ok = await services.alerts.confirmFinancialAction({ title: `${label} cuenta`, details: [{ label: 'Cuenta', value: accountNumber }], confirmLabel: label, danger });
    if (!ok) return;
    setPending(true);
    try {
      if (action === 'block') await services.accounts.blockAccount(accountNumber);
      else if (action === 'unblock') await services.accounts.unblockAccount(accountNumber);
      else await services.accounts.closeAccount(accountNumber);
      await services.alerts.showSuccess(`Cuenta ${action === 'block' ? 'bloqueada' : action === 'unblock' ? 'desbloqueada' : 'cerrada'}.`);
    } catch (err) { await presentError(services.alerts, err); }
    finally { setPending(false); }
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
      <Button size="sm" loading={pending} onClick={() => void doAction('block', 'Bloquear')}>Bloquear</Button>
      <Button size="sm" variant="secondary" loading={pending} onClick={() => void doAction('unblock', 'Desbloquear')}>Desbloquear</Button>
      <Button size="sm" variant="danger" loading={pending} onClick={() => void doAction('close', 'Cerrar', true)}>Cerrar</Button>
    </div>
  );
}