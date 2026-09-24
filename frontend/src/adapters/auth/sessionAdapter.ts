/**
 * Adaptador de sesión JWT — única capa que lee/escribe el token (F2).
 *
 * Política (Frontend-Adapters.md §2): sin refresh endpoint en el backend,
 * se usa sessionStorage (no localStorage) para persistir entre recargas sin
 * vida larga; se documenta el trade-off XSS. Nunca se persiste passwords.
 */

import type { SessionPort } from '../../domain/ports';
import type { Session } from '../../domain/models';

const STORAGE_KEY = 'aurora.session.v1';

interface StoredSession {
  token: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: number;
  user: Session['user'];
}

function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['token'] === 'string' &&
    typeof v['expiresAt'] === 'number' &&
    typeof v['user'] === 'object' &&
    v['user'] !== null &&
    typeof (v['user'] as Record<string, unknown>)['role'] === 'string'
  );
}

export function createSessionAdapter(storage: Storage = sessionStorage): SessionPort {
  return {
    saveSession(session: Session): void {
      const payload: StoredSession = {
        token: session.token,
        tokenType: session.tokenType,
        expiresIn: session.expiresIn,
        expiresAt: session.expiresAt,
        user: session.user,
      };
      storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    },

    readSession(): Session | null {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!isStoredSession(parsed)) {
          storage.removeItem(STORAGE_KEY);
          return null;
        }
        if (parsed.expiresAt <= Date.now()) {
          storage.removeItem(STORAGE_KEY);
          return null;
        }
        return parsed;
      } catch {
        storage.removeItem(STORAGE_KEY);
        return null;
      }
    },

    getAccessToken(): string | null {
      return this.readSession()?.token ?? null;
    },

    clearSession(): void {
      storage.removeItem(STORAGE_KEY);
    },

    isExpired(): boolean {
      const s = this.readSession();
      return s === null || s.expiresAt <= Date.now();
    },
  };
}
