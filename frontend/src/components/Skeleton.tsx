/** Skeleton — dimensiones estables durante carga (§4). */
export function Skeleton({ width = '100%', height = 16 }: { width?: string | number; height?: number }) {
  return (
    <div
      className="skeleton"
      style={{ width: typeof width === 'number' ? `${width}px` : width, height: `${height}px` }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card" aria-hidden="true">
      <Skeleton width="55%" height={18} />
      <div style={{ height: 12 }} />
      <Skeleton width="80%" height={28} />
      <div style={{ height: 10 }} />
      <Skeleton width="40%" height={14} />
      <div style={{ height: 16 }} />
      <Skeleton width="30%" height={34} />
    </div>
  );
}

/** Contenedor de carga anunciado a lectores de pantalla. */
export function LoadingBlock({ label = 'Cargando información…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" style={{ display: 'none' }}>
      {label}
    </div>
  );
}
