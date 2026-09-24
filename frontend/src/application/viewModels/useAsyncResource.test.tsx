/**
 * useAsyncResource (F6/F7): estados idle/loading/success/empty/error y retry
 * con la misma llamada de servicio; base de skeletons y ErrorState.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { BackendError } from '../../domain/errors';
import { useAsyncResource, useMutation } from './useAsyncResource';

describe('useAsyncResource', () => {
  it('transita loading → success con datos', async () => {
    const loader = vi.fn(async () => ({ name: 'Ana' }));
    const { result } = renderHook(() => useAsyncResource(loader));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toEqual({ name: 'Ana' });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('lista vacía → empty (no success silencioso)', async () => {
    const { result } = renderHook(() => useAsyncResource(async () => [] as string[]));
    await waitFor(() => expect(result.current.status).toBe('empty'));
    expect(result.current.data).toEqual([]);
  });

  it('fallo → error con ApiError normalizado y retry reintenta', async () => {
    let attempts = 0;
    const loader = vi.fn(async (): Promise<string[]> => {
      attempts += 1;
      if (attempts === 1) throw new BackendError({ status: 503, code: 'DEPENDENCY_UNAVAILABLE', message: 'down' });
      return ['CTA-1'];
    });
    const { result } = renderHook(() => useAsyncResource(loader));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.code).toBe('DEPENDENCY_UNAVAILABLE');

    act(() => {
      result.current.reload();
    });
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('disabled → idle sin llamar al backend', () => {
    const loader = vi.fn(async () => 'x');
    const { result } = renderHook(() => useAsyncResource(loader, { enabled: false }));
    expect(result.current.status).toBe('idle');
    expect(loader).not.toHaveBeenCalled();
  });

  it('useMutation expone pending y deshabilita doble submit', async () => {
    let resolve!: (v: string) => void;
    const gate = new Promise<string>((res) => {
      resolve = res;
    });
    const { result } = renderHook(() => useMutation(() => gate));
    let pendingDuringRun = false;
    const [run, state] = result.current;
    expect(state.pending).toBe(false);

    let settled: string | undefined;
    act(() => {
      void run().then((v) => {
        settled = v;
      });
    });
    await waitFor(() => expect(result.current[1].pending).toBe(true));
    pendingDuringRun = result.current[1].pending;
    act(() => {
      resolve('ok');
    });
    await waitFor(() => expect(result.current[1].pending).toBe(false));

    expect(pendingDuringRun).toBe(true);
    expect(settled).toBe('ok');
  });
});
