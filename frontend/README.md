# Aurora Banco — Frontend (React + TypeScript + Vite)

Banca digital con identidad original (amarillo cálido, charcoal, neutros).
Consume el backend banking en `VITE_API_BASE_URL` (default `http://localhost:8080`).
Contratos autoritativos: `frontendSDD/` para UI y `backendSDD/` para URLs, métodos,
DTOs, estados, roles JWT y códigos de error.

## Requisitos

- Node 22 + npm 11 (`npm ci` exige lockfile sincronizado).
- Backend disponible en `http://localhost:8080` (o ajustar `VITE_API_BASE_URL`).

## Configuración

```bash
cp .env.example .env   # opcional; default VITE_API_BASE_URL=http://localhost:8080
npm ci
```

## Scripts

| Comando      | Efecto                              |
|--------------|-------------------------------------|
| `npm run dev`   | Vite dev en `http://localhost:5173` (origen permitido por el CORS backend) |
| `npm run build` | `tsc -b && vite build` (typecheck estricto + bundle) |
| `npm run lint`  | `oxlint` |
| `npm test`      | `vitest run` (43 pruebas: adapters, mappers, sesión, guards, servicios, view-models) |

## Arquitectura (hexagonal de cliente)

```text
Pages/Components → Role Modules → Application Services → HTTP/JWT/Alert Adapters → backend
```

Fronteras obligatorias:

- `domain/` no importa React, browser, fetch ni SweetAlert2.
- `adapters/http/` es la única capa que contacta `VITE_API_BASE_URL`.
- `adapters/auth/` es la única capa que lee/escribe el JWT (sessionStorage, nunca passwords).
- `adapters/alerts/` es la única capa que llama SweetAlert2.
- Componentes/páginas nunca construyen URLs ni headers `Authorization`.

## Sesión y errores

- Login `POST /api/v1/auth/login` → mapper valida `token/tokenType/expiresIn/rol` → sessionStorage.
- Protegidas: `Authorization: Bearer <token>` + `X-Request-Id` generado por petición.
- `401` en protegida: limpia sesión y redirige a login con aviso de expiración.
- `403`: conserva sesión y muestra alerta de permiso.
- `400/422/404/409/503/500`: alerta por categoría con `code` estable + `requestId`; nunca stack traces.
- Acciones financieras/destructivas exigen confirmación SweetAlert con monto, cuenta, destino o crédito explícitos.

## Módulos por rol

| Rol | Ruta | Contenido |
|-----|------|-----------|
| Público | `/login`, `/register/*` | login, registro natural/empresa/usuario |
| NATURAL_CUSTOMER | `/customer/*` | dashboard, perfil, cuentas, préstamos, transferencias, operaciones |
| BUSINESS_CUSTOMER | `/business/*` | empresa, usuarios delegados, aprobación/rechazo |
| BUSINESS_OPERATOR | `/business/operator/*` | cuentas empresa, transferencias alto valor |
| BUSINESS_SUPERVISOR | `/business/supervisor` | cola pendientes, aprobar/rechazar (sin cuerpo, contrato §7.3) |
| TELLER_EMPLOYEE | `/teller` | búsqueda, apertura/consulta, depósitos, retiros, bloqueo/desbloqueo/cierre |
| COMMERCIAL_EMPLOYEE | `/commercial` | búsqueda y préstamo por cuenta de cliente |
| INTERNAL_ANALYST | `/analyst` | empleados, estado de clientes, ciclo de préstamos, auditoría paginada |

## Docker

```bash
docker build -t aurora-frontend:local .
docker run --rm -p 8081:80 aurora-frontend:local
# Con backend no default:
docker build --build-arg VITE_API_BASE_URL=http://localhost:8080 -t aurora-frontend:local .
```

El bundle habla con el backend desde el navegador (`http://localhost:8080`);
no se integra al Compose raíz porque el contrato Docker backend actual no lo solicita.

## CORS

Desarrollo: origen `http://localhost:5173` permitido por el backend
(`FRONTEND_ORIGIN`), preflight `OPTIONS` → `204` sin JWT, `X-Request-Id` expuesto.
Ver `backendSDD/Backend-Cors-Security.md`.
