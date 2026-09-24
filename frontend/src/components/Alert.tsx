/** Alert inline — icono + texto, nunca color como único indicador (§4/§7). */
import type { ReactNode } from 'react';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

const ICONS: Record<AlertTone, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
};

const LABELS: Record<AlertTone, string> = {
  info: 'Información',
  success: 'Éxito',
  warning: 'Advertencia',
  error: 'Error',
};

export function Alert({ tone, title, children }: { tone: AlertTone; title?: string; children?: ReactNode }) {
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span aria-hidden="true">{ICONS[tone]}</span>
      <div className="alert-body">
        <strong>
          {title ?? LABELS[tone]}
        </strong>
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}
