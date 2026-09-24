/**
 * useAsyncResource — máquina de estados idle/loading/success/empty/error
 * con retry reutilizando la misma llamada de servicio (Domain-Services §4).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { toApiError } from '../../domain/errors';
import type { ApiError } from '../../domain/models';

export type ViewStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface AsyncResource<T> {
  status: ViewStatus;
  data: T | null;
  error: ApiError | null;
  reload: () => void;
  setData: (updater: T | ((prev: T | null) => T)) => void;
}

function isEmptyResult(value: unknown): boolean {
  return Array.isArray(value) && value.length === 0;
}

export function useAsyncResource<T>(
  loader: () => Promise<T>,
  options?: { enabled?: boolean; isEmpty?: (value: T) => boolean },
): AsyncResource<T> {
  const enabled = options?.enabled ?? true;
  const [status, setStatus] = useState<ViewStatus>(enabled ? 'loading' : 'idle');
  const [data, setDataState] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const isEmptyRef = useRef(options?.isEmpty ?? isEmptyResult);
  isEmptyRef.current = options?.isEmpty ?? isEmptyResult;

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setError(null);
    loaderRef
      .current()
      .then((value) => {
        if (cancelled) return;
        setDataState(value);
        setStatus(isEmptyRef.current(value) ? 'empty' : 'success');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(toApiError(e));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const setData = useCallback((updater: T | ((prev: T | null) => T)) => {
    setDataState((prev) => {
      const next = typeof updater === 'function' ? (updater as (p: T | null) => T)(prev) : updater;
      return next;
    });
  }, []);

  return { status, data, error, reload, setData };
}

export interface MutationState {
  pending: boolean;
}

/** Ejecuta una mutación con estado pending para deshabilitar submit. */
export function useMutation<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
): [(...args: Args) => Promise<R | undefined>, MutationState] {
  const [pending, setPending] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (...args: Args): Promise<R | undefined> => {
    setPending(true);
    try {
      return await fnRef.current(...args);
    } catch (e) {
      // El caller decide cómo presentar; sólo propagamos undefined explícito.
      throw e;
    } finally {
      setPending(false);
    }
  }, []);

  return [run, { pending }];
}
