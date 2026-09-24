/** Stub temporal para módulos de rol pendientes (F5). */
import { useSession } from '../../application/session/SessionProvider';

export function ModulePlaceholder({ title, items }: { title: string; items: string[] }) {
  const { session } = useSession();
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p style={{ color: 'var(--color-ink-soft)' }}>
            Módulo {session?.user.role} · {session?.user.username}
          </p>
        </div>
      </div>
      <section className="card">
        <h2>En implementación</h2>
        <p>Las secciones de este módulo incluirán:</p>
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
