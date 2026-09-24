/** EmptyState + ErrorState — explican la siguiente acción y ofrecen retry (§4). */
import { Button } from './Button';

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon = '◎',
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}) {
  return (
    <div className="state-box">
      <div className="state-icon" aria-hidden="true">
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = 'No se pudo cargar la información',
}: {
  error: { status?: number; code?: string; message: string; requestId?: string };
  onRetry?: () => void;
  title?: string;
}) {
  const support: string[] = [];
  if (error.code) support.push(`Código: ${error.code}`);
  if (error.requestId) support.push(`Solicitud: ${error.requestId}`);
  return (
    <div className="error-box" role="alert">
      <div className="error-title">{title}</div>
      <div>{error.message}</div>
      {support.length > 0 && <div className="error-support">{support.join(' · ')}</div>}
      {onRetry && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      )}
    </div>
  );
}
