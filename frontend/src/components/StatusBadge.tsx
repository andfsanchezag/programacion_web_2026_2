/** StatusBadge — texto + icono + color; nunca color solo (§4/§7). */
import type { AccountStatus, CustomerStatus, LoanStatus, TransferStatus } from '../domain/enums';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusMeta {
  label: string;
  tone: BadgeTone;
  icon: string;
}

const ACCOUNT_STATUS_META: Record<AccountStatus, StatusMeta> = {
  ACTIVE: { label: 'Activa', tone: 'success', icon: '●' },
  BLOCKED: { label: 'Bloqueada', tone: 'danger', icon: '⊘' },
  CLOSED: { label: 'Cerrada', tone: 'neutral', icon: '✕' },
  PENDING_ACTIVATION: { label: 'Pendiente de activación', tone: 'warning', icon: '◷' },
};

const CUSTOMER_STATUS_META: Record<CustomerStatus, StatusMeta> = {
  ACTIVE: { label: 'Activo', tone: 'success', icon: '●' },
  INACTIVE: { label: 'Inactivo', tone: 'neutral', icon: '○' },
  BLOCKED: { label: 'Bloqueado', tone: 'danger', icon: '⊘' },
  PENDING: { label: 'Pendiente', tone: 'warning', icon: '◷' },
};

const LOAN_STATUS_META: Record<LoanStatus, StatusMeta> = {
  UNDER_REVIEW: { label: 'En revisión', tone: 'warning', icon: '◷' },
  APPROVED: { label: 'Aprobado', tone: 'info', icon: '✓' },
  REJECTED: { label: 'Rechazado', tone: 'danger', icon: '✕' },
  DISBURSED: { label: 'Desembolsado', tone: 'success', icon: '●' },
  CLOSED: { label: 'Cerrado', tone: 'neutral', icon: '■' },
};

const TRANSFER_STATUS_META: Record<TransferStatus, StatusMeta> = {
  PENDING: { label: 'Pendiente', tone: 'warning', icon: '◷' },
  WAITING_FOR_APPROVAL: { label: 'Esperando aprobación', tone: 'warning', icon: '◷' },
  APPROVED: { label: 'Aprobada', tone: 'info', icon: '✓' },
  REJECTED: { label: 'Rechazada', tone: 'danger', icon: '✕' },
  EXECUTED: { label: 'Ejecutada', tone: 'success', icon: '●' },
  EXPIRED: { label: 'Expirada', tone: 'neutral', icon: '■' },
};

export type StatusKind = 'account' | 'customer' | 'loan' | 'transfer';

const REGISTRIES: Record<StatusKind, Record<string, StatusMeta>> = {
  account: ACCOUNT_STATUS_META,
  customer: CUSTOMER_STATUS_META,
  loan: LOAN_STATUS_META,
  transfer: TRANSFER_STATUS_META,
};

export function StatusBadge({ kind, status }: { kind: StatusKind; status: string }) {
  const meta = REGISTRIES[kind][status] ?? {
    label: status,
    tone: 'neutral' as BadgeTone,
    icon: '•',
  };
  return (
    <span className={`status-badge status-${meta.tone}`}>
      <span className="badge-icon" aria-hidden="true">
        {meta.icon}
      </span>
      {meta.label}
    </span>
  );
}
