/**
 * Alert adapter (F6/F7): cada categoría de error backend invoca su alerta
 * SweetAlert2; la confirmación financiera exige identidad explícita.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }));

import Swal from 'sweetalert2';
import { createAlertAdapter, presentError } from './alertAdapter';
import type { ApiError } from '../../domain/models';

const fireMock = vi.mocked(Swal.fire);

function apiError(status: number, code: string): ApiError {
  return { status, code, message: `${code} message`, requestId: 'req-test' };
}

beforeEach(() => {
  fireMock.mockReset();
  fireMock.mockResolvedValue({ isConfirmed: false } as never);
});

describe('alertAdapter', () => {
  it('clasifica cada categoría de error a su alerta', async () => {
    const alerts = createAlertAdapter();

    await presentError(alerts, apiError(400, 'INVALID_REQUEST'));
    expect(fireMock).toHaveBeenCalledTimes(1);
    expect(fireMock.mock.calls[0][0]).toMatchObject({ title: 'Revisa los datos ingresados' });

    fireMock.mockClear();
    await presentError(alerts, apiError(401, 'INVALID_CREDENTIALS'));
    expect(fireMock.mock.calls[0][0]).toMatchObject({ title: 'No se pudo iniciar sesión' });

    fireMock.mockClear();
    await presentError(alerts, apiError(403, 'FORBIDDEN'));
    expect(fireMock.mock.calls[0][0]).toMatchObject({ title: 'No tienes permiso para esta acción' });

    fireMock.mockClear();
    await presentError(alerts, apiError(409, 'INSUFFICIENT_BALANCE'));
    expect(fireMock.mock.calls[0][0]).toMatchObject({ title: 'La operación no puede completarse' });

    fireMock.mockClear();
    await presentError(alerts, apiError(503, 'DEPENDENCY_UNAVAILABLE'));
    expect(fireMock.mock.calls[0][0]).toMatchObject({ title: 'El servicio no está disponible' });

    fireMock.mockClear();
    await presentError(alerts, apiError(500, 'INTERNAL_ERROR'));
    expect(fireMock.mock.calls[0][0]).toMatchObject({ title: 'Ocurrió un error inesperado' });
  });

  it('no alerta cuando la sesión ya expiró (el router redirige a login)', async () => {
    const alerts = createAlertAdapter();
    await presentError(alerts, { ...apiError(401, 'INVALID_CREDENTIALS'), sessionExpired: true });
    expect(fireMock).not.toHaveBeenCalled();
  });

  it('incluye código estable y requestId, nunca stack traces', async () => {
    const alerts = createAlertAdapter();
    await alerts.showConflict(apiError(409, 'INSUFFICIENT_BALANCE'));
    const firstCall = fireMock.mock.calls[0]?.[0] as unknown as { html: string };
    const html = String(firstCall.html);
    expect(html).toContain('INSUFFICIENT_BALANCE');
    expect(html).toContain('req-test');
    expect(html.toLowerCase()).not.toContain('stack');
  });

  it('confirmFinancialAction muestra monto/cuenta/destino y devuelve la decisión', async () => {
    const alerts = createAlertAdapter();
    fireMock.mockResolvedValue({ isConfirmed: true } as never);

    const confirmed = await alerts.confirmFinancialAction({
      title: 'Confirmar transferencia',
      details: [
        { label: 'Monto', value: '150000 COP' },
        { label: 'Origen', value: 'CTA-100200300' },
        { label: 'Destino', value: 'CTA-900800700' },
      ],
    });

    expect(confirmed).toBe(true);
    const confirmCall = fireMock.mock.calls[0]?.[0] as unknown as { html: string };
    const html = String(confirmCall.html);
    expect(html).toContain('150000 COP');
    expect(html).toContain('CTA-900800700');
  });

  it('showSuccess y showExpiredSession usan títulos estables', async () => {
    const alerts = createAlertAdapter();
    await alerts.showSuccess('ok');
    expect(fireMock.mock.calls[0][0]).toMatchObject({ title: 'Operación exitosa' });
    fireMock.mockClear();
    await alerts.showExpiredSession('expiró');
    expect(fireMock.mock.calls[0][0]).toMatchObject({ title: 'Sesión finalizada' });
  });
});
