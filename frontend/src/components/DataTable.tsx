/** DataTable — loading/rows/empty/error + fallback responsive (§4/§5). */
import type { ReactNode } from 'react';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { ErrorState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  numeric?: boolean;
}

export interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: { status?: number; code?: string; message: string; requestId?: string } | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyActionLabel?: string;
  emptyOnAction?: () => void;
  caption?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'Sin registros',
  emptyMessage = 'Cuando haya datos disponibles aparecerán aquí.',
  emptyActionLabel,
  emptyOnAction,
  caption,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="table-wrap" role="status" aria-live="polite" aria-label="Cargando tabla">
        <div style={{ padding: 'var(--space-3)' }}>
          <Skeleton height={36} />
          <div style={{ height: 8 }} />
          <Skeleton height={36} />
          <div style={{ height: 8 }} />
          <Skeleton height={36} />
        </div>
      </div>
    );
  }
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} title="No se pudo cargar la tabla" />;
  }
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} actionLabel={emptyActionLabel} onAction={emptyOnAction} />;
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        {caption && <caption style={{ captionSide: 'top', textAlign: 'left', padding: '4px 0', fontSize: '0.85rem' }}>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" style={col.numeric ? { textAlign: 'right' } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td key={col.key} className={col.numeric ? 'num' : undefined}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
