/** Tarjetas de producto: nombre/estado/saldo/última actualización/acción (§F6.1.3). */
import type { ReactNode } from 'react';
import type { BankAccountSummary, LoanSummary, TransferSummary } from '../domain/models';
import { ACCOUNT_TYPE_LABELS, LOAN_TYPE_LABELS } from '../domain/enums';
import { StatusBadge } from './StatusBadge';
import { MoneyAmount } from './MoneyAmount';
import { Button } from './Button';

function LastUpdate({ at }: { at?: string }) {
  const label = at ? new Date(at).toLocaleString('es-CO') : new Date().toLocaleString('es-CO');
  return <div className="card-meta">Actualizado: {label}</div>;
}

export function AccountCard({
  account,
  actions,
  lastUpdate,
}: {
  account: BankAccountSummary;
  actions?: ReactNode;
  lastUpdate?: string;
}) {
  return (
    <article className="card card-stagger" aria-label={`Cuenta ${account.accountNumber}`}>
      <div className="section-head">
        <h3>
          {ACCOUNT_TYPE_LABELS[account.accountType] ?? account.accountType} · {account.accountNumber}
        </h3>
        <StatusBadge kind="account" status={account.status} />
      </div>
      <MoneyAmount value={account.availableBalance} currency={account.currency} />
      <LastUpdate at={lastUpdate} />
      {actions && <div className="card-actions">{actions}</div>}
    </article>
  );
}

export function LoanCard({
  loan,
  actions,
  lastUpdate,
}: {
  loan: LoanSummary;
  actions?: ReactNode;
  lastUpdate?: string;
}) {
  return (
    <article className="card card-stagger" aria-label={`Crédito ${loan.loanId}`}>
      <div className="section-head">
        <h3>
          {LOAN_TYPE_LABELS[loan.loanType] ?? loan.loanType} · {loan.loanId}
        </h3>
        <StatusBadge kind="loan" status={loan.status} />
      </div>
      <div>
        <span className="card-meta">Monto solicitado: </span>
        <MoneyAmount value={loan.requestedAmount} />
      </div>
      {loan.approvedAmount !== undefined && (
        <div>
          <span className="card-meta">Monto aprobado: </span>
          <MoneyAmount value={loan.approvedAmount} />
        </div>
      )}
      <div className="card-meta">Plazo: {loan.termInMonths} meses</div>
      <LastUpdate at={lastUpdate} />
      {actions && <div className="card-actions">{actions}</div>}
    </article>
  );
}

export function TransferCard({
  transfer,
  actions,
  lastUpdate,
}: {
  transfer: TransferSummary;
  actions?: ReactNode;
  lastUpdate?: string;
}) {
  const waiting = transfer.status === 'WAITING_FOR_APPROVAL';
  return (
    <article
      className="card card-stagger"
      aria-label={`Transferencia ${transfer.transferId}`}
      style={waiting ? { borderLeft: '4px solid var(--color-warning)' } : undefined}
    >
      <div className="section-head">
        <h3>Transferencia {transfer.transferId}</h3>
        <StatusBadge kind="transfer" status={transfer.status} />
      </div>
      <div className="card-meta">
        Origen: {transfer.sourceAccountNumber} → Destino: {transfer.destinationAccountNumber}
      </div>
      <MoneyAmount value={transfer.amount} />
      {transfer.executedAt && (
        <div className="card-meta">Ejecutada: {new Date(transfer.executedAt).toLocaleString('es-CO')}</div>
      )}
      <LastUpdate at={lastUpdate} />
      {actions && <div className="card-actions">{actions}</div>}
    </article>
  );
}

/** DashboardCard genérico: loading | loaded | error + acción directa. */
export function DashboardCard({
  title,
  value,
  status,
  lastUpdate,
  actionLabel,
  onAction,
  loading = false,
  error = null,
  onRetry,
  children,
}: {
  title: string;
  value?: ReactNode;
  status?: ReactNode;
  lastUpdate?: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  error?: { message: string; code?: string; requestId?: string } | null;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  return (
    <article className="card card-stagger">
      <div className="section-head">
        <h3>{title}</h3>
        {status}
      </div>
      {loading && (
        <div aria-hidden="true">
          <div className="skeleton" style={{ height: 28, width: '70%' }} />
        </div>
      )}
      {!loading && error && (
        <div role="alert" style={{ fontSize: '0.9rem' }}>
          <div style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Error al cargar</div>
          <div>{error.message}</div>
          {error.code && <div className="card-meta">Código: {error.code}</div>}
          {onRetry && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              <Button variant="secondary" size="sm" onClick={onRetry}>
                Reintentar
              </Button>
            </div>
          )}
        </div>
      )}
      {!loading && !error && (
        <>
          {value}
          {children}
          {lastUpdate && <div className="card-meta">Actualizado: {lastUpdate}</div>}
          {actionLabel && onAction && (
            <div className="card-actions">
              <Button variant="secondary" size="sm" onClick={onAction}>
                {actionLabel}
              </Button>
            </div>
          )}
        </>
      )}
    </article>
  );
}
