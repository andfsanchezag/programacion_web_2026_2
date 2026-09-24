/** Historial de operaciones — filtro por cuenta + paginación local simple. */
import { useState } from 'react';
import { useSession } from '../../application/session/SessionProvider';
import { useAsyncResource } from '../../application/viewModels/useAsyncResource';
import { Button, DataTable, EmptyState, type Column } from '../../components';
import { OPERATION_TYPE_LABELS } from '../../domain/enums';
import type { OperationSummary } from '../../domain/models';

const PAGE_SIZE = 10;

export function CustomerOperationsPage() {
  const { services } = useSession();
  const accounts = useAsyncResource(() => services.accounts.getMyAccounts());
  const [accountFilter, setAccountFilter] = useState('');
  const [page, setPage] = useState(0);
  const ops = useAsyncResource(
    () => services.audits.getMyOperations({ accountNumber: accountFilter }),
    { enabled: accountFilter !== '' },
  );

  const columns: Array<Column<OperationSummary>> = [
    { key: 'id', header: 'ID', render: (o) => o.operationId },
    { key: 'type', header: 'Operación', render: (o) => OPERATION_TYPE_LABELS[o.operationType] ?? o.operationType },
    { key: 'date', header: 'Fecha', render: (o) => new Date(o.executionDate).toLocaleString('es-CO') },
    { key: 'product', header: 'Producto', render: (o) => o.affectedProduct },
    { key: 'by', header: 'Realizada por', render: (o) => o.performedBy },
  ];

  const rows = ops.data ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const view = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const applyFilter = (value: string): void => {
    setAccountFilter(value);
    setPage(0);
    ops.reload();
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Historial de operaciones</h1>
          <p style={{ color: 'var(--color-ink-soft)' }}>Depósitos, retiros, transferencias y demás movimientos.</p>
        </div>
      </div>

      <section className="card section" aria-label="Filtros">
        <div className="field">
          <label htmlFor="ops-account">Cuenta (opcional)</label>
          <select id="ops-account" value={accountFilter} onChange={(e) => applyFilter(e.target.value)}>
            <option value="">Todas mis cuentas</option>
            {(accounts.data ?? []).map((a) => (
              <option key={a.accountNumber} value={a.accountNumber}>
                {a.accountNumber}
              </option>
            ))}
          </select>
        </div>
      </section>

      {accountFilter === '' ? (
        (accounts.data?.length ?? 0) === 0 && accounts.status === 'success' ? (
          <EmptyState
            title="No tienes cuentas para consultar"
            message="Abre una cuenta en ventanilla para registrar tus primeros movimientos."
            icon="▤"
          />
        ) : (
          <EmptyState
            title="Selecciona una cuenta para ver el historial"
            message="El historial se consulta por producto: elige una de tus cuentas para listar sus operaciones."
            icon="▤"
          />
        )
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={view}
            rowKey={(o) => o.operationId}
            loading={ops.status === 'loading'}
            error={ops.error}
            onRetry={ops.reload}
            emptyTitle="Sin operaciones para esta cuenta"
            emptyMessage="Cuando esta cuenta registre movimientos aparecerán aquí con su fecha y producto afectado."
            caption={
              ops.data && ops.data.length > 0
                ? `Página ${page + 1} de ${totalPages} · ${ops.data.length} operaciones`
                : undefined
            }
          />
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)', alignItems: 'center' }}>
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Anterior
              </Button>
              <span aria-live="polite">
                Página {page + 1} de {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
