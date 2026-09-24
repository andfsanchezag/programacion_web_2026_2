/**
 * Session adapter (F2/F7): persistencia en sessionStorage, expiración local,
 * limpieza y política de no persistir secretos.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { createSessionAdapter } from './sessionAdapter';
import type { Session } from '../../domain/models';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k: string) => data.get(k) ?? null,
    key: (i: number) => [...data.keys()][i] ?? null,
    removeItem: (k: string) => {
      data.delete(k);
    },
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
}

function liveSession(): Session {
  return {
    token: 'tok-123',
    tokenType: 'Bearer',
    expiresIn: 3600,
    expiresAt: Date.now() + 3600_000,
    user: { userId: 'u1', username: 'ana', email: 'ana@example.com', role: 'NATURAL_CUSTOMER' },
  };
}

describe('sessionAdapter', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = memoryStorage();
  });

  it('persiste y recupera la sesión con token y rol', () => {
    const adapter = createSessionAdapter(storage);
    adapter.saveSession(liveSession());

    const read = adapter.readSession();
    expect(read?.token).toBe('tok-123');
    expect(read?.user.role).toBe('NATURAL_CUSTOMER');
    expect(adapter.getAccessToken()).toBe('tok-123');
    expect(adapter.isExpired()).toBe(false);
  });

  it('trata la sesión expirada como ausente y la purga', () => {
    const adapter = createSessionAdapter(storage);
    adapter.saveSession({ ...liveSession(), expiresAt: Date.now() - 1000 });

    expect(adapter.readSession()).toBeNull();
    expect(adapter.getAccessToken()).toBeNull();
    expect(adapter.isExpired()).toBe(true);
  });

  it('purga contenido corrupto en lugar de propagarlo', () => {
    storage.setItem('aurora.session.v1', 'no-json{{{');
    const adapter = createSessionAdapter(storage);

    expect(adapter.readSession()).toBeNull();
    expect(storage.getItem('aurora.session.v1')).toBeNull();
  });

  it('clearSession elimina el token (logout / 401)', () => {
    const adapter = createSessionAdapter(storage);
    adapter.saveSession(liveSession());
    adapter.clearSession();

    expect(adapter.readSession()).toBeNull();
    expect(adapter.getAccessToken()).toBeNull();
  });

  it('nunca persiste contraseñas en storage', () => {
    const adapter = createSessionAdapter(storage);
    adapter.saveSession(liveSession());

    const raw = storage.getItem('aurora.session.v1') ?? '';
    expect(raw.toLowerCase()).not.toContain('password');
  });
});
