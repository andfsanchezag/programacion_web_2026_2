# Frontend Orchestrator State

## Run record (run-02: backend restart + REPAIR_BACKEND revalidation — 2026-09-24)

- runId: run-2026-09-24-frontend-diag-02
- fase: revalidación de los 4 ítems `REPAIR_BACKEND` de run-01 tras reparación del backend
- acciones: revisión de diffs sin commitear del backend → `npm run build` (exit 0) → `npx vitest run` (40/40 ficheros, **269/269 tests, exit 0**) → `docker compose build bank-api` (exit 0, imagen `9c190c78b6f4`) → `docker compose up -d --force-recreate bank-api` → contenedor `bank-api` **Up (healthy)** con la imagen nueva → suite de 11 sondas HTTP

### Veredicto por ítem (run-02)

| Ítem | Sonda | Resultado | Estado |
|---|---|---|---|
| 1. CORS preflight | `OPTIONS /api/v1/auth/login` (Origin `http://localhost:5173`, method POST) | **204** + `ACAO=http://localhost:5173`, `Vary=Origin`, `ACAM=GET, POST, PUT, PATCH, DELETE, OPTIONS`, `ACAH=Authorization, Content-Type, Accept, X-Request-Id`, `ACEH=X-Request-Id` | **PASS** |
| 1. CORS preflight ruta protegida sin JWT | `OPTIONS /api/v1/natural-customer/profile` (PUT) | **204** con cabeceras CORS (no exige JWT, §6) | **PASS** |
| 1. CORS simple request origen aprobado | `GET /health` con Origin | 200 + `ACAO=http://localhost:5173` | **PASS** |
| 1. CORS origen rechazado | `GET /health` con `Origin: http://evil.example.com` | 200 **sin** cabeceras CORS permisivas (no refleja) | **PASS** |
| 2. Login usuario desconocido | `POST /auth/login` usuario inexistente | **401 `INVALID_CREDENTIALS`** (antes 404 `USER_NOT_FOUND`), mensaje genérico, sin enumeración | **PASS** |
| 3. `X-Request-Id` header | todas las sondas (éxito, error, preflight) | header presente; eco del id del request (`req-fe-unknown-user`) verificado en body + header | **PASS** |
| 4. Documentación 8 rutas | grep `Api-rest-endpoints.md` | 8/8 documentadas (§6.x accounts, §7.x supervisor reject, §8.4–8.8 teller, §10.x analyst reject) | **PASS** |
| Regresión login válido | `seed-teller`/`Secret123!` | 200, `tokenType=Bearer`, `expiresIn=3600`, role correcto | PASS |
| Regresión password errónea | login existente + password malo | 401 `INVALID_CREDENTIALS` | PASS |
| Regresión sin token | `GET /natural-customer/profile` | 401 `AUTHENTICATION_REQUIRED` | PASS |
| Regresión token inválido | `GET /natural-customer/accounts` | 401 `INVALID_CREDENTIALS` | PASS |
| Regresión rol incorrecto | supervisor endpoint con token teller | 403 `FORBIDDEN` | PASS |
| Regresión endpoint con JWT + Origin | `GET /teller/customers?identification=1017123456` | 200 `CustomerResponseDTO` | PASS |
| Backend build/tests | `npm run build`, `npx vitest run` | build 0; **269/269** (40 ficheros) | PASS |

### Estado actual

- Los 4 blockers de run-01 están **resueltos y verificados en vivo** contra el contenedor `bank-api` recreado.
- Fase frontend desbloqueada: siguiente tarea por orden de dependencias = **F1 (application foundation)**, luego F2→F8.
- Pendiente no bloqueante de run-01: `untested` de endpoints frontend (se ejecutará la matriz de smoke desde F2/F3 en adelante).


# Frontend Orchestrator State

## Run record (run-01: resume diagnostics + backend contract verification — 2026-09-24)

- runId: run-2026-09-24-frontend-diag-01
- fase: `REPAIR_BACKEND` (stop rule §1 of `Frontend-orchestrator-prompt.md`: CORS rule missing, error response inconsistent)
- frontend root: `frontend/` (confirmed); API base contract: `VITE_API_BASE_URL`, default `http://localhost:8080` (no `.env` yet)
- backend: live at `http://localhost:8080`; `GET /health` → 200 `{"status":"UP","persistence":"mysql+mongo"}`

### Per-deliverable state table

| Deliverable | State | Evidence |
|---|---|---|
| F1 Application foundation | NOT_STARTED | `frontend/src` is the bare Vite React counter scaffold; no router, providers, tokens, guards or common components |
| F2 HTTP + JWT adapters | NOT_STARTED | no `src/adapters/`; baseline build/lint green only after dependency install |
| F3 Service + mapper layer | NOT_STARTED | no `src/application/`, `src/domain/`; design-side mapping complete: 40/40 backend routes have a row in `Frontend-Adapters.md` |
| F4 Public authentication | NOT_STARTED | no login/registration pages |
| F5 Role modules (7 roles) | NOT_STARTED | no `src/modules/` role folders |
| F6 UX feedback (skeletons, alerts, confirmations) | NOT_STARTED | no SweetAlert2 dependency installed |
| F7 Testing | NOT_STARTED | no test runner or tests in `frontend/package.json` |
| F8 Docker and delivery | NOT_STARTED | no `frontend/Dockerfile`, no `.env.example`; root Compose has no frontend service (not yet requested by backend Docker contract) |
| Baseline build/lint/tests | PARTIAL | `npm install` → 0; `npm run build` → 0; `npm run lint` → 0 (both were exit 1 before install: missing `node_modules`); no unit tests exist to run |
| Backend endpoint matrix (live probes) | VERIFIED | see probe table below |
| CORS contract vs `Backend-Cors-Security.md` | FAILING | preflight and Origin probes return no CORS headers; zero CORS code in `backend/src` or `backend/package.json` |
| Login error response vs `Rest-validation.md` §3.1 | FAILING | unknown username → `404 USER_NOT_FOUND`; contract requires `401 INVALID_CREDENTIALS` |
| `X-Request-Id` response header | FAILING | id is echoed inside the error body (`requestId`) but never as a response header; CORS `exposedHeaders: X-Request-Id` would expose nothing |
| Endpoint documentation coverage (`Api-rest-endpoints.md`) | PARTIAL | 8 implemented routes absent from the endpoint contract doc (list below); mappings exist in `Frontend-Adapters.md` |

### Live backend probe evidence (2026-09-24, non-browser client)

| Probe | Result | Contract | Verdict |
|---|---|---|---|
| `GET /health` | 200 `{"status":"UP"}` | smoke check | OK |
| `OPTIONS /api/v1/auth/login` (Origin `http://localhost:5173`, `Access-Control-Request-Method/Headers`) | **404, zero `Access-Control-*` headers** | Cors-Security §3/§5 preflight 204 | **FAIL** |
| `GET /health` with `Origin: http://localhost:5173` | 200, **`Access-Control-Allow-Origin` absent** | Cors-Security §7.1 | **FAIL** |
| grep `Access-Control|FRONTEND_ORIGIN|cors` over `backend/src/**` + `backend/package.json` | zero matches | Cors-Security §2/§5 | **FAIL** |
| `POST /auth/login` valid (`seed-teller`/`Secret123!`) | 200 `{token, tokenType:Bearer, expiresIn:3600, user:{userId,username,email,role}}`; JWT claims `sub,role,email,identification,iat,exp` | Api-rest-endpoints §3.1 | OK |
| `POST /auth/login` existing user, wrong password | 401 `INVALID_CREDENTIALS`, standard envelope, `requestId` echoed from request `X-Request-Id: req-fe-wrongpw` | Rest-validation §3.1 | OK |
| `POST /auth/login` **unknown username** | **404 `USER_NOT_FOUND`** | Rest-validation §3.1: wrong credentials → 401 `INVALID_CREDENTIALS` | **FAIL (user-enumeration leak)** |
| `GET /natural-customer/profile` no token | 401 `AUTHENTICATION_REQUIRED`, envelope with `timestamp,status,code,message,path,requestId,details` | Global-exception-handler §3 | OK |
| `GET .../transfers/pending` garbage token | 401 `INVALID_CREDENTIALS` | Global-exception-handler §4 | OK |
| `GET .../business-supervisor/transfers/pending` with `TELLER_EMPLOYEE` token | **403 `FORBIDDEN`** (`Forbidden for role TELLER_EMPLOYEE`) | Global-exception-handler §4 | OK |
| `GET /api/v1/teller/customers?identification=1017123456` with teller token | 200 `CustomerResponseDTO` | Frontend-Adapters row 94 | OK |
| Error response `X-Request-Id` **header** | absent on all responses | Cors-Security §4 (`exposedHeaders`) | **FAIL** |


### Endpoint coverage reconciliation (design vs registry)

- Backend route registry (`backend/src/application/server.ts`): 40 routes (1 health + 39 API).
- `frontendSDD/Frontend-Adapters.md` mapping rows: **40/40 mapped** (design complete; `mapped=40, blocked=8, untested=40` — `untested` counts frontend HTTP exercises, which cannot start until CORS is repaired).
- Implemented routes **missing from `backendSDD/Adapters/Api-rest-endpoints.md`** (request/response behavior undocumented in the authoritative contract → `REPAIR_CONTRACT` documentation debt, acknowledged as "6 rutas extra" in `backendSDD/orchestrator-state.md`):
  1. `GET /api/v1/business-operator/accounts` (validation doc exists §6.2; endpoint DTO doc missing)
  2. `GET /api/v1/teller/customers?identification=`
  3. `POST /api/v1/teller/accounts` (open)
  4. `GET /api/v1/teller/accounts/{accountNumber}`
  5. `PATCH /api/v1/teller/accounts/{accountNumber}/unblock`
  6. `PATCH /api/v1/teller/accounts/{accountNumber}/close`
  7. `PATCH /api/v1/business-supervisor/transfers/{transferId}/reject`
  8. `PATCH /api/v1/internal-analyst/loans/{loanId}/reject`
  Mitigation: all 8 have frontend mappings in `Frontend-Adapters.md` and several are exercised by `backend/scripts/seed-data.ts`; live probes will verify the rest after CORS repair. Non-blocking for implementation, blocking for the `untested=0` gate until probed.

### REPAIR_BACKEND — exact backend contract required

1. **CORS (blocking, `backendSDD/Backend-Cors-Security.md` §3/§5)** — register CORS before routes, after request-id middleware:
   - `origin`: allow-list from env `FRONTEND_ORIGIN`, default `http://localhost:5173` (no wildcard, reject others)
   - `methods`: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
   - `allowedHeaders`: `Authorization, Content-Type, Accept, X-Request-Id`
   - `exposedHeaders`: `X-Request-Id`
   - `credentials`: `false`; `optionsSuccessStatus`: `204`
   - Order: `request id → CORS → JSON parser → auth → routes → global error handler`
   - Until then every browser request from the Vite dev origin fails; no frontend endpoint can be exercised or verified.
2. **Login error code (blocking, `Rest-validation.md` §3.1)** — unknown username on `POST /api/v1/auth/login` must return `401 INVALID_CREDENTIALS` with the standard envelope (same as wrong password), not `404 USER_NOT_FOUND`. The 404 leaks user existence and breaks the documented `401 → clear form hint` recovery flow in `Frontend-User-Flows.md` §1.
3. **`X-Request-Id` response header (required by Cors-Security §4)** — set the assigned/requested id as an `X-Request-Id` response header on success and error responses so `exposedHeaders` has content and support can correlate without parsing the body.
4. **Documentation (non-blocking, `REPAIR_CONTRACT`)** — add the 8 routes listed above to `Api-rest-endpoints.md` (and to `Rest-validation.md` where absent) with method, path, request DTO, success status and error codes.

### Verified-good backend behavior the frontend can rely on

Standard error envelope shape; stable machine-readable `code`; `requestId` propagation from request header; 401 classification (missing/invalid token); 403 role enforcement; login response DTO and JWT claims; `CustomerResponseDTO` shape; seeded role accounts (`seed-analyst`, `seed-teller`, `seed-supervisor`, `seed-operator`, `seed-commercial`, password `Secret123!`) for later per-role E2E.

### Commands and exit codes (run-01)

| Command | Exit |
|---|---|
| `cd frontend; npm install --no-audit --no-fund` | 0 (added 27 packages; created `package-lock.json`) |
| `cd frontend; npm run build` (before install) | 1 (`TS2688: Cannot find type definition 'vite/client'/'node'`) |
| `cd frontend; npm run build` (after install) | 0 (built in 1.09s) |
| `cd frontend; npm run lint` (before install) | 1 (`oxlint` not found) |
| `cd frontend; npm run lint` (after install) | 0 (0 warnings, 0 errors) |
| HTTP probes (health, CORS preflight/Origin, login ×3, 401 ×2, 403, teller search) | see probe table |

- Files changed this run: `frontend/package-lock.json` (generated by install), this state file. No backend files modified (the pending `backendSDD/orchestrator-state.md` diff pre-exists this run).
- Decision: stop rule §1 applies → no frontend implementation until items 1–2 are repaired (items 3–4 may follow in the same backend run).
- Next action: backend orchestrator applies REPAIR_BACKEND items 1–2 (+3–4); frontend run-02 resumes at F1 and proceeds F1→F8 by dependency order, then executes the endpoint smoke matrix against the live backend.

## Required report (run-01)

```text
Status: BLOCKED (REPAIR_BACKEND)
Frontend stack: React + TypeScript + Vite
Task selected: Resume diagnostics (§4) — halted by §1 stop rule before first implementation task (F1)
Files changed: frontend/package-lock.json (npm install), frontendSDD/frontend-orchestrator-state.md (new)
Commands and exit codes: npm install 0; build 1→0 (pre/post install); lint 1→0 (pre/post install); HTTP probes executed (table above)
Build/lint/unit/E2E results: build PASS, lint PASS, unit 0 (none exist yet), E2E 0 (blocked by CORS)
Endpoint coverage: 40/40 design-mapped; 0/40 frontend-exercised (CORS blocks browser); 8 routes undocumented in Api-rest-endpoints.md
Role modules: 0/7 implemented (NOT_STARTED)
JWT/CORS results: JWT contract VERIFIED live (login 200, 401 missing/invalid, 403 wrong role, envelope + requestId); CORS FAILING (no preflight, no Access-Control-* headers, no backend CORS code)
Remaining blockers: (1) backend CORS per Backend-Cors-Security.md §3/§5; (2) login unknown-user 404→401 INVALID_CREDENTIALS; (3) X-Request-Id response header; (4) doc debt for 8 implemented routes (non-blocking)
Next action: backend repairs items 1–2; frontend resumes at F1 (foundation) then F2→F8
```



## Required report (run-02)

```text
Status: IN_PROGRESS (blockers REPAIR_BACKEND resueltos y verificados; frontend aún no implementado)
Frontend stack: React + TypeScript + Vite
Task selected: Revalidación backend tras reparación (restart + 4 ítems REPAIR_BACKEND)
Files changed: frontendSDD/frontend-orchestrator-state.md (run-02); backend rebuild/recreate por contenedor (código backend ya reparado previamente, sin cambios míos)
Commands and exit codes: backend npm run build 0; npx vitest run 0 (40 ficheros, 269/269); docker compose build bank-api 0 (imagen 9c190c78b6f4); compose up --force-recreate 0 (bank-api healthy); 11 sondas HTTP ejecutadas
Build/lint/unit/E2E results: backend build PASS, backend unit 269/269 PASS; frontend build PASS, lint PASS (run-01); frontend unit/E2E pendientes desde F7
Endpoint coverage: 40/40 design-mapped; 8/8 rutas antes sin documentar ahora en Api-rest-endpoints.md; smoke frontend pendiente (F2+)
Role modules: 0/7 implemented (NOT_STARTED — desbloqueado para F1)
JWT/CORS results: CORS PASS (preflight 204 con cabeceras exactas §3, ACAO para origen aprobado, sin CORS para origen rechazado, ruta protegida preflight sin JWT); X-Request-Id PASS (header en éxito/error/preflight + eco); login desconocido PASS (401 INVALID_CREDENTIALS); JWT 401/403/regresiones PASS
Remaining blockers: ninguno de run-01; no bloqueantes: matriz de smoke frontend (F2+), screenshots/accessibility (F6/F7)
Next action: iniciar F1 (foundation: config, router, providers, tokens, componentes comunes) y continuar F2→F8
```
