/**
 * Adaptador de alertas — única capa que importa SweetAlert2 (F2/F6).
 * Cada categoría de error del backend tiene su presentación; nunca se
 * muestran stack traces ni texto crudo de base de datos.
 */

import Swal from 'sweetalert2';
import type { AlertPort, ConfirmFinancialConfig } from '../../domain/ports';
import type { ApiError } from '../../domain/models';

const base = {
  background: '#ffffff',
  confirmButtonColor: '#d9a900',
  cancelButtonColor: '#6b7280',
  color: '#202124',
  customClass: { popup: 'aurora-swal' },
  buttonsStyling: true,
};

function supportLine(error: ApiError): string {
  const parts: string[] = [];
  if (error.code) parts.push(`Código: <strong>${escapeHtml(error.code)}</strong>`);
  if (error.requestId) parts.push(`Solicitud: <code>${escapeHtml(error.requestId)}</code>`);
  return parts.length > 0 ? `<div class="aurora-swal-support">${parts.join(' · ')}</div>` : '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fireError(icon: 'error' | 'warning' | 'info', title: string, error: ApiError): Promise<void> {
  const message = escapeHtml(error.message || 'Error inesperado');
  await Swal.fire({
    ...base,
    icon,
    title,
    html: `<p>${message}</p>${supportLine(error)}`,
    confirmButtonText: 'Entendido',
  });
}

export function createAlertAdapter(): AlertPort {
  return {
    showValidationError: (error) => fireError('warning', 'Revisa los datos ingresados', error),
    showAuthenticationError: (error) => fireError('error', 'No se pudo iniciar sesión', error),
    showAuthorizationError: (error) => fireError('warning', 'No tienes permiso para esta acción', error),
    showConflict: (error) => fireError('warning', 'La operación no puede completarse', error),
    showDependencyError: (error) => fireError('error', 'El servicio no está disponible', error),
    showUnexpectedError: (error) => fireError('error', 'Ocurrió un error inesperado', error),

    async confirmFinancialAction(config: ConfirmFinancialConfig): Promise<boolean> {
      const rows = config.details
        .map(
          (d) =>
            `<tr><th scope="row">${escapeHtml(d.label)}</th><td><strong>${escapeHtml(d.value)}</strong></td></tr>`,
        )
        .join('');
      const result = await Swal.fire({
        ...base,
        icon: config.danger ? 'warning' : 'question',
        title: config.title,
        html: `<table class="aurora-swal-details"><tbody>${rows}</tbody></table>`,
        showCancelButton: true,
        confirmButtonText: config.confirmLabel ?? 'Confirmar',
        cancelButtonText: config.cancelLabel ?? 'Cancelar',
        reverseButtons: true,
        customClass: {
          ...(base.customClass ?? {}),
          confirmButton: config.danger ? 'aurora-confirm aurora-confirm-danger' : 'aurora-confirm',
        },
        ...(config.danger ? { confirmButtonColor: '#b42318' } : {}),
      });
      return result.isConfirmed === true;
    },

    async showSuccess(message: string): Promise<void> {
      await Swal.fire({ ...base, icon: 'success', title: 'Operación exitosa', text: message, confirmButtonText: 'Continuar' });
    },

    async showExpiredSession(message: string): Promise<void> {
      await Swal.fire({ ...base, icon: 'info', title: 'Sesión finalizada', text: message, confirmButtonText: 'Ir a iniciar sesión' });
    },
  };
}

/**
 * Presenta cualquier error de dominio en el alerta correcta según status/code.
 * 401 con sessionExpired lo maneja el router (mensaje de expiración); aquí
 * sólo se clasifica para efectos de flujos públicos (login inválido).
 */
export function presentError(alerts: AlertPort, error: unknown): Promise<void> {
  const api = normalizeError(error);
  if (api.sessionExpired) return Promise.resolve(); // el router ya redirige con mensaje
  switch (api.status) {
    case 400:
    case 422:
      return alerts.showValidationError(api);
    case 401:
      return alerts.showAuthenticationError(api);
    case 403:
      return alerts.showAuthorizationError(api);
    case 404:
    case 409:
      return alerts.showConflict(api);
    case 503:
      return alerts.showDependencyError(api);
    case 0:
      return alerts.showDependencyError(api);
    default:
      return alerts.showUnexpectedError(api);
  }
}

function normalizeError(error: unknown): ApiError {
  if (typeof error === 'object' && error !== null && 'status' in error && 'code' in error && 'message' in error) {
    return error as ApiError;
  }
  return { status: 500, code: 'INTERNAL_ERROR', message: (error as Error)?.message ?? 'Error inesperado' };
}
