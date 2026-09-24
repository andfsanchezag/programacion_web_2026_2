/**
 * SessionProvider: estado de sesión para React + redirección por expiración.
 * El adapter de sesión sigue siendo el ÚNICO que toca el JWT en storage;
 * este provider sólo refleja su estado en el árbol React (F2/F4).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '../../domain/models';
import { type AppServices } from '../container';

export interface SessionContextValue {
  session: Session | null;
  services: AppServices;
  /** Guarda una sesión devuelta por login y dispara 'signed-in'. */
  signIn: (session: Session) => void;
  /** Logout: llama al backend (best effort) y limpia estado local. */
  signOut: () => Promise<void>;
  /** true la primera vez que una expiración 401 dispara redirect. */
  expiredNotice: string | null;
  clearExpiredNotice: () => void;
}

const ServicesContext = createContext<AppServices | null>(null);
const SessionContext = createContext<SessionContextValue | null>(null);

export function ServicesProvider({
  services,
  children,
}: {
  services: AppServices;
  children: ReactNode;
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): AppServices {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices debe usarse dentro de ServicesProvider');
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const services = useServices();
  const [session, setSession] = useState<Session | null>(() => services.session.readSession());
  const [expiredNotice, setExpiredNotice] = useState<string | null>(null);
  const expiredRef = useRef(false);

  // Escucha eventos del HTTP adapter (401 en petición protegida).
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === null || e.key === 'aurora.session.v1') {
        setSession(services.session.readSession());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [services]);

  const notifySession = useCallback(
    (event: { type: 'expired' | 'signed-in' | 'signed-out' }) => {
      if (event.type === 'expired') {
        setSession(null);
        if (!expiredRef.current) {
          expiredRef.current = true;
          setExpiredNotice('Tu sesión expiró o es inválida. Vuelve a iniciar sesión.');
        }
      } else if (event.type === 'signed-in') {
        expiredRef.current = false;
        setExpiredNotice(null);
        setSession(services.session.readSession());
      } else {
        setSession(services.session.readSession());
      }
    },
    [services],
  );

  // Compatibilidad con la notificación en vivo del HTTP adapter:
  // el adaptador llama a window.__auroraNotify cuando un 401 limpia la sesión.
  useEffect(() => {
    const w = window as unknown as { __auroraNotify?: (e: { type: 'expired' | 'signed-in' | 'signed-out' }) => void };
    w.__auroraNotify = notifySession;
    return () => {
      delete w.__auroraNotify;
    };
  }, [notifySession]);

  const signIn = useCallback(
    (next: Session) => {
      services.session.saveSession(next);
      notifySession({ type: 'signed-in' });
    },
    [services, notifySession],
  );

  const signOut = useCallback(async () => {
    try {
      await services.auth.logout();
    } finally {
      services.session.clearSession();
      notifySession({ type: 'signed-out' });
    }
  }, [services, notifySession]);

  const clearExpiredNotice = useCallback(() => setExpiredNotice(null), []);

  const value = useMemo<SessionContextValue>(
    () => ({ session, services, signIn, signOut, expiredNotice, clearExpiredNotice }),
    [session, services, signIn, signOut, expiredNotice, clearExpiredNotice],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de SessionProvider');
  return ctx;
}
