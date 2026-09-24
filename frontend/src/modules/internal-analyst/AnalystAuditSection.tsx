/** Sección: Auditoría inmutable con filtros y paginación. */
import { useState } from 'react';
import { useSession } from '../../application/session/SessionProvider';
import { useAsyncResource } from '../../application/viewModels/useAsyncResource';
import { Button, DataTable, Input, type Column } from '../../components';
import { OPERATION_TYPE_LABELS } from '../../domain/enums';
import type { AuditLogSummary } from '../../domain/models';

export function AuditLogsSection() {
  const { services } = useSession();
  const [filters, setFilters] = useState({ userId: '', operationType: '', accountNumber: '', page: 0, size: 20 });
  const logs = useAsyncResource(() => services.audits.getAuditLogs(filters));
  const [page, setPage] = useState(0);

  const columns: Array<Column<AuditLogSummary>> = [
    { key: 'id', header: 'Audit ID', render: (a) => a.auditId },
    { key: 'type', header: 'Operación', render: (a) => OPERATION_TYPE_LABELS[a.operationType] ?? a.operationType },
    { key: 'date', header: 'Fecha', render: (a) => new Date(a.operationDate).toLocaleString('es-CO') },
    { key: 'by', header: 'Realizado por', render: (a) => `${a.performedBy} (${a.userRole})` },
    { key: 'product', header: 'Producto', render: (a) => a.affectedProduct },
  ];

  const rows = logs.data?.content ?? [];
  const totalPages = Math.max(1, Math.ceil((logs.data?.totalElements ?? 0) / 20));
  const view = rows.slice(page * 20, page * 20 + 20);

  return (
    <section className="card section" aria-label="Auditoría">
      <h2>Auditoría (bitácora inmutable)</h2>
      <div className="form-grid">
        <Input label="userId" value={filters.userId} onChange={(e) => setFilters(f => ({ ...f, userId: e.target.value }))} placeholder="Filtrar por usuario" />
        <Input label="operationType" value={filters.operationType} onChange={(e) => setFilters(f => ({ ...f, operationType: e.target.value }))} placeholder="Filtrar por tipo" />
        <Input label="accountNumber" value={filters.accountNumber} onChange={(e) => setFilters(f => ({ ...f, accountNumber: e.target.value }))} placeholder="Filtrar por producto" />
      </div>
      <DataTable columns={columns} rows={view} rowKey={(a) => a.auditId} loading={logs.status === 'loading'} error={logs.error} onRetry={logs.reload} emptyTitle="Sin registros de auditoría" emptyMessage="Los registros aparecerán aquí según los filtros." />
      {totalPages > 1 && <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)', alignItems: 'center' }}><Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Anterior</Button><span>Página {page + 1} de {totalPages}</span><Button variant="secondary" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}>Siguiente</Button></div>}
    </section>
  );
}