# Orchestrator State

## Run record (run-09: alineación completa SDD cross-stack — 2026-09-23)
- runId: run-2026-09-23-alignment-09
- fase: `REPAIR_CONTRACT` — alineación documental Java/TypeScript
- archivos: `backendSDD/Contract-alignment.md` (nuevo), `Orchestrator-prompt.md`,
  `Domain/Input-ports.md`, `Domain/Output-ports.md`,
  `Adapters/Api-rest-endpoints.md`, `Adapters/Rest-validation.md`,
  `Adapters/Global-exception-handler.md`, `Adapters/Use-cases-adapters.md`
- decisión: `Contract-alignment.md` es la autoridad transversal; Java y TypeScript
  comparten parámetros y semántica, con adaptación únicamente de retornos async.
  `400` es el estado de validación por defecto; `422` requiere declaración explícita.
  MySQL usa puerto interno 3306 y el puerto host es configurable.
- evidencia: documentos enlazados; pendiente ejecutar el alignment gate contra cada
  firma, endpoint, alias y estado persistente del código.
- estado: `IN_PROGRESS` — el `COMPLETE` anterior queda invalidado hasta completar
  la matriz endpoint-validación-error y verificar las firmas semánticas en ambos perfiles.
- siguienteAccion: ejecutar diagnóstico por entregable según `Orchestrator-prompt.md`,
  actualizar la matriz de trazabilidad y repetir build, unit, integración y Docker.

## Run record (run-08: validación DTO + Rest-validation — 2026-09-23)
- runId: run-2026-09-23-validation-08
- fase: `REPAIR_CONTRACT` (§6.1 DTOs) + doc `backendSDD/Adapters/Rest-validation.md`
- archivos: `adapters/rest/validation/requestValidation.ts` (nuevo) + wiring en los
  4 mappers, `TellerController`, `updateProfile`, `approveLoan` y rutas (reject,
  payments, business-users, analyst-employee, audit-enum); `*StatusException`→409;
  doc verificado línea por línea (derivación de códigos, filtros query)
- evidencia: build 0; unit 264/264; cobertura 99.89/96.49/99.83; E2E 14/14;
  seed 60/60; email inválido en vivo → 400 uniforme
- decisión usuario: `rejectionReason` se valida pero no se persiste (sin cambio)
- siguienteAccion: commit + push (solicitado)

## Run record (run-07: cobertura 90% — 2026-09-23)
- runId: run-2026-09-23-coverage-07
- fase: `5A/5B` (cierre de cobertura) — **líneas 99.97%, ramas 96.44%, funciones 99.83%**
- baseline: 71.50% líneas (adapters/mappers/useCases/controllers/LoanService sin cubrir)
- archivos (solo tests + config, cero cambios de producción salvo 5 líneas de código
  muerto en `errorHandler.ts` — rama `SyntaxError` con status inalcanzable):
  - `vitest.config.ts` (excludes documentados: `server.ts`, `database/**` — exigen DB
    vivas y se cubren con E2E/seed/smoke; `dtos.ts`, `entities.ts`,
    `AuditLogDocument.ts` — solo tipos sin ejecutable)
  - `test/adapters/schema-defs.test.ts`, `typeorm-mappers.test.ts`,
    `typeorm-adapters.test.ts` (6 adapters con repos en memoria),
    `rest-mappers.test.ts`, `rest-controllers.test.ts`, `usecases.test.ts` (8 roles),
    ampliaciones en `persistence/security/LoanService/CoverageGaps.test.ts`
- evidencia: `npm run build` → 0; `npm test` → 39 ficheros, **258/258**, 0;
  `npm run coverage` → 99.97/96.44/99.83; `test:e2e` → 13/13
- siguienteAccion: commit + push (a solicitud del usuario)

## Run record (run-06: seed de datos + endpoints muertos — 2026-09-23)
- runId: run-2026-09-23-seed-06
- fase: `REPAIR_CONTRACT` (3 endpoints muertos reparados al origen) + poblado §3-§10
- archivos:
  - `backend/scripts/seed-data.ts` (nuevo, `npm run seed`: empleados vía
    adapters + 60 pasos HTTP con asserts de código y cuerpo, fail-fast)
  - `backend/application/adapters/useCases/BusinessCustomerUseCaseImpl.ts`
    (§5.2: `registerCompanyUser` → `registerCustomerUser` con validación de empresa;
    antes exigía analista y el endpoint siempre daba 403)
  - `backend/application/domain/valueobjects/SystemRole.ts`
    (§5.3/§5.4: `canApproveBusinessTransfers` incluye BUSINESS_CUSTOMER)
  - `backend/application/domain/services/AuthorizationService.ts`
    (§7.2: `canExecute` en Transfer incluye SUPERVISOR/ANALYST; §9.1: rama Loan
    incluye COMMERCIAL_EMPLOYEE)
  - `backend/application/server.ts` (§10.1 register employee → 201)
  - tests: +1 usecase 5.2, +1 business-approve, +1 supervisor/analyst-operate,
    +1 commercial-loan (fallaron antes, pasan después)
  - `tsconfig.json` (incluye `scripts/`), `package.json` (script `seed`), `README.md`
- evidencia: `npm run seed` → **60 pasos OK, 0 fallos** (35 endpoints SDD + extras);
  `npm run build` → 0; `npm test` → 206/206; `test:e2e` → 13/13;
  `docker compose build` → 0, 3/3 healthy
- gaps menores conocidos (no bloqueantes): `rejectionReason` de §5.4 se acepta pero no
  se persiste en detalles de auditoría; respuesta de pago usa `LoanResponseDTO`
- siguienteAccion: commit + push (solicitado por el usuario)

## Run record (run-05: consistencia + Mongo push-down + E2E — 2026-09-23)
- runId: run-2026-09-23-final-05
- fase: `INTEGRATION_VALIDATION` final — dictamen: `COMPLETE` (§5, veredicto abajo)
- archivos:
  - `application/domain/services/TransferService.ts` (compensación en `executeTransfer`:
    revierte dinero persistido ante fallo intermedio o final)
  - `application/domain/services/LoanService.ts` (compensación en `disburseLoan`)
  - `application/domain/ports/out/AuditLogRepositoryPort.ts` (`AuditLogFilter`,
    `AuditLogPage`, `findPaged`)
  - `application/adapters/persistence/mongoose/mongo.adapter.ts` (`findPaged` con
    filtros/skip/limit/count en Mongo + resolución userId→username)
  - `application/server.ts` (ruta audit-logs usa `findPaged`; 404 uniforme para rutas
    no registradas; `run()` ya honraba envelopes)
  - `test/domain/services/TransferService.test.ts` (+2 rollback), `LoanService.test.ts`
    (+1 rollback), `test/adapters/persistence.test.ts` (+1 findPaged) — fallaron antes,
    pasan después
  - `test/e2e/api.e2e.test.ts` (nuevo, 13 pruebas HTTP vs `E2E_BASE_URL`),
    `vitest.e2e.config.ts` (nuevo), `vitest.config.ts` (excluye e2e del unit),
    `package.json` (script `test:e2e`), `test/domain/services/mocks.ts` (stub findPaged)
  - `README.md` (documenta `test:e2e`)
- decisiones: pagos de préstamos (`registerLoanPayment`) y depósitos/retiros son
  single-resource (un solo update) → sin compensación, documentado; transferencias y
  desembolsos (multi-recurso) → compensación; ruta audit por cuenta mantiene caso de
  uso (autorización) con slice en memoria, listado general 100% push-down
- evidencia:
  - `npm run build` → 0; `npm test` → 33 ficheros, 202/202, 0 (e2e excluido por config)
  - `npm run test:e2e` vs contenedor → 13/13, 0 (health, register 201, duplicado 409,
    user 201, login JWT 200, login malo 401, perfil 200, 401×2, 403, DELETE→403 por rol,
    ruta fantasma 404, JSON roto 400, logout 204)
  - `docker compose build` → 0; `up -d` → 3/3 healthy; `down` → 0; re-`up` limpio →
    3/3 healthy + `/health` UP + E2E 13/13 repetido
  - desacoplamiento: 0 imports de express/mongoose/typeorm/mongodb/mysql2 en `domain/`
  - entorno: queda LEVANTADO y saludable

### Diagnóstico por fases §3.1 (criterio §5.12)
| Fase | Entregable | Existe | Cumple contrato | Validación | Estado |
|---|---|---|---|---|---|
| 0A | stack TS/Node detectado | sí | sí | build+tests+entrypoint+scripts | VERIFIED |
| 0B | compose MySQL/Mongo, .env.example, appConfig | sí | sí (override 3308 documentado) | up+bootstrap+smoke | VERIFIED |
| 0C | Dockerfile, .dockerignore, app en compose, README | sí | sí | gate §6.2 completo | VERIFIED |
| 1 | modelos, VOs, enums, excepciones, output ports | sí | sí | 202 tests + grep desacople | VERIFIED |
| 2A | entidades TypeORM, mappers, adapters MySQL | sí | sí | round-trip real + tests | VERIFIED |
| 2B | schemas Mongoose, mapper, AuditLogMongoAdapter | sí | sí (+findPaged) | round-trip real + tests | VERIFIED |
| 2C | input ports por rol (8) | sí | sí | casos de uso + rutas | VERIFIED |
| 3A | servicios + 8 casos de uso | sí | sí (incl. §6.6/§6.4/compensación) | tests fail→pass + E2E | VERIFIED |
| 3B | DTOs, mappers, controllers, 35+6 rutas | sí | sí (códigos vía envelopes) | smoke códigos + E2E | VERIFIED |
| 4 | JWT + middleware + handler global + 404 catch-all | sí | sí | gate Fase 4 + 23 tests handler + E2E | VERIFIED |
| 5A | tests dominio/servicios | sí | sí | 202/202 | VERIFIED |
| 5B | tests adapters/REST/persistencia | sí | sí | 202/202 | VERIFIED |
| 6 | reparación + Docker + integración + E2E | sí | sí | build/up/smoke/down/re-up/E2E | VERIFIED |

### Dictamen §5 — COMPLETE
```text
Estado: COMPLETE
Stack validado: TypeScript/Node (Express + TypeORM + Mongoose + Vitest)
Fase seleccionada y motivo: run-05 cierra los 3 faltantes del run-04
Cambios realizados: compensación executeTransfer/disburseLoan (+3 tests); findPaged Mongo (+port, ruta, test); E2E automatizado (13 tests + config + script); 404 catch-all; README
Comandos ejecutados y códigos de salida: build 0; test 0 (202/202); test:e2e 0 (13/13); compose build 0; up 3/3 healthy; down 0; re-up healthy + /health UP + E2E repetido 13/13
Pruebas: unitarias 202/202; integración real APROBADA; E2E 13/13
Docker: build OK; 3/3 healthy; smoke + E2E OK; apagado y rearranque limpio OK (repetido)
Gates aprobados: §5.1–§5.12 (compilación, servicios, DDL, desacople, trazabilidad, contrato 35/35, integración, cierre reproducible, matriz, Docker §6.2, handler §9, diagnóstico por fases)
Faltantes o bloqueos: ninguno exigible por §5 (mejoras futuras no bloqueantes: transacciones distribuidas reales, 6 rutas extra por documentar en SDD)
Siguiente acción exacta: ninguna de implementación; operar con `docker compose up -d` y `npm run test:e2e`
```

## Run record (run-04: FASE 4 handler + REPAIR_CONTRACT + contrato REST — 2026-09-23)
- runId: run-2026-09-23-contract-04
- fase: `REPAIR_CONTRACT` (handler global + DELETE + códigos HTTP + Create&Execute +
  balance + auditoría) — estado: `IN_PROGRESS` (criterios §5.6/§5.11 pasan a VERIFIED;
  queda E2E formal y endurecer consistencia transaccional)
- archivos:
  - `backend/application/adapters/rest/middleware/errorHandler.ts` (nuevo:
    `requestIdMiddleware`, `classifyError` determinístico 400/401/403/404/409/503/500,
    `toErrorCode`, `globalErrorHandler` con forma uniforme, respeto a `headersSent`,
    log server-side de 5xx; desconocidos → 500, nunca 400)
  - `backend/application/server.ts` (requestId + handler global registrado
    tras rutas; `run()` propaga a `next` y honra envelopes `{status,body}` de
    controladores — antes todo era 200; logout → 204; DELETE loan → resolve+closeLoan;
    ruta natural transfers → create&execute; audit-logs con filtros userId/
    operationType/cuenta + paginación page/size)
  - `backend/application/domain/services/TransferService.ts` (creación bajo
    umbral asigna APPROVED vía PENDING→WAITING→APPROVED con approvalDate/approvedBy
    §6.6/§9.6; validación de saldo suficiente en origen §6.4/§6.5)
  - `backend/test/adapters/errorHandler.test.ts` (nuevo, 23 pruebas:
    clasificación, shape, requestId, headersSent, HTTP real por puerto efímero)
  - `backend/test/domain/services/TransferService.test.ts` (expectativa
    APPROVED bajo umbral; nuevo test de saldo insuficiente — ambos fallaron antes,
    pasan después)
- evidencia:
  - `npm run build` → 0; `npm test` → 33 ficheros, 198/198, 0
  - bug DELETE reproducido en contenedor viejo: `DELETE loans/LOAN-NOEXISTE` → 204;
    tras rebuild → 404 `LOAN_NOT_FOUND` con forma uniforme + requestId
  - `docker compose build` → 0; `up -d` → 3/3 healthy; smoke: register 201, login 200,
    logout 204, profile 200, sin token 401, rol incorrecto 403
  - E2E real: teller abre 2 cuentas + deposita 10000; `POST transfers 1500` → 201
    EXECUTED con executedAt; balances 8500/1500; `audit_logs` 1→6
  - transferencia sin fondos → 409 `INSUFFICIENT_BALANCE` uniforme
  - `GET audit-logs?page=0&size=1` → 1 item, totalElements 6, totalPages 6;
    `?userId=e2euser001` → 2 (creation+execution)
  - `down` → 0; `up -d` limpio → 3/3 healthy + `/health` UP; entorno queda LEVANTADO
- barrido REST: los 35 endpoints SDD existen con método/ruta correctos; el servidor
  añade 6 rutas extra no documentadas (supervisor reject, operator accounts, teller
  customers/accounts/get/unblock/close, analyst loans reject) — superconjunto, sin
  contradicción; códigos 200/201/202/204 ahora fluyen desde controladores
- limitaciones registradas (no bloquean COMPLETE salvo criterio estricto):
  - transferencias/pagos/desembolsos sin transacción DB multi-recurso (compensación
    pendiente; riesgo de aplicación parcial ante fallo intermedio)
  - paginación de auditoría en memoria (sin push-down al adapter Mongo)
  - E2E automatizado formal pendiente (el E2E de este run fue manual con curl)
- siguienteAccion: pruebas E2E automatizadas (registro→cuentas→transfer→auditoría) y
  transacciones/compensación en operaciones críticas; luego re-evaluar COMPLETE §5.

## Run record (run-03: FASE 0C containerización — 2026-09-23)
- runId: run-2026-09-23-phase0C-03
- fase: `0C` — estado: `VERIFIED` (gate §6.2 completo con evidencia)
- diagnóstico previo: build exit 0, tests 174/174 exit 0; `Dockerfile`/`Dockerfile.*`/
  `.dockerignore` inexistentes → `0C` NOT_STARTED (tarea de menor dependencia, §3.1.3).
- archivos:
  - `backend/Dockerfile` (nuevo: base `node:22-slim` + `npm@11.19.0`
    fijado, etapa build con `npm ci` + `npm run build` + `tsc -p tsconfig.build.json`,
    etapa runtime con usuario `node`, `EXPOSE 8080`, `HEALTHCHECK /health`,
    `CMD npx tsx application/server.ts`)
  - `backend/tsconfig.build.json` (nuevo: emit `dist/` solo de
    `application/`, sin alterar `npm run build` typecheck)
  - `backend/.dockerignore` (nuevo: node_modules, dist, logs, .git,
    .env reales, temporales)
  - `docker-compose.yml` (servicio `bank-api`, red `bank-net`, healthchecks en los 3
    servicios, `depends_on` con `condition: service_healthy`, env con nombres de
    servicio `mysql-db`/`mongo-db`; se eliminó `version` obsoleta; decisión 3308
    documentada en comentario)
  - `README.md` (sección "Ejecución con Docker": build, up, ps, health, logs, down,
    variables, pruebas dentro/fuera, limpieza de volúmenes)
- decisiones técnicas registradas:
  - `npm ci` fallaba en la imagen (EUSAGE: lock desincronizado para npm v10 del
    `node:22-slim`, pedía `@types/node@26.6.2`): se fijó `npm@11.19.0` (= versión
    local) en la imagen en vez de alterar el lockfile. `npm install` local + re-test
    confirmaron que el lock estaba bien para npm 11.
  - Runtime con `tsx` y no `node dist/`: el código usa imports relativos sin extensión
    (válidos con tsx/bundlers, inválidos en ESM puro de node →
    `ERR_MODULE_NOT_FOUND` comprobado). La etapa build conserva el gate de compilación.
- evidencia (gate §6.2):
  - `docker compose config` → exit 0 (app, MySQL, Mongo, red, volúmenes, env OK)
  - `docker compose build --no-cache` → exit 0 (`bank-api:local Built`)
  - `docker compose up -d` → `bank-api`/`bank-mysql`/`bank-mongo` healthy
  - smoke desde host contra contenedor: `/health` UP; register cliente+usuario 200
    (fila `docker-cust-001` verificada en MySQL); login JWT 200; profile 200;
    sin token 401; rol incorrecto 403
  - `docker compose down` → exit 0; `up -d` limpio → los 3 healthy + `/health` UP
- entorno: queda LEVANTADO y saludable (3/3 healthy).
- siguienteAccion: Fase 4 pendiente (Global Exception Handler §Global-exception-handler.md:
  sin middleware global de 4 args, sin `requestId`/formato uniforme, fallback a 400 en
  `toStatus` viola "desconocidos → 500") + `REPAIR_CONTRACT` (`DELETE loans/{id}` 204
  sin operación de dominio) + barrido REST vs `Api-rest-endpoints.md`.

## Run record (run-02: INTEGRATION_VALIDATION — 2026-09-23, continúa run-01)
- runId: run-2026-09-23-integration-02
- fase: `INTEGRATION_VALIDATION` — estado: `IN_PROGRESS` (gates de integración con DB
  reales: APROBADOS; queda `REPAIR_CONTRACT` candidata + comparación REST completa)
- infra 100% en Docker: `docker compose up -d` → `bank-mysql` (healthy,
  `0.0.0.0:3308->3306/tcp`, puerto host 3308 por conflicto con mysqld nativo, según
  `.env` documentado) + `bank-mongo` (`0.0.0.0:27017->27017/tcp`). Imágenes
  `mysql:8.0` y `mongo:6.0` descargadas en este run (primera vez). Motor Docker Desktop
  hubo que iniciarlo manualmente (estaba detenido).
- arranque app (`npm run start`, lee `.env` con `MYSQL_PORT=3308`):
  `[bootstrap] MySQL 3306 conectado (bank_db), esquema sincronizado` +
  `[bootstrap] Mongo 27017 conectado (audit_db)` +
  `[server] Banking API escuchando en :8080` — TypeORM auto-creó 6 tablas
  (`bank_accounts, customers, loans, operations, transfers, users`); Mongoose creó
  colección `audit_logs` en `audit_db`.
- smoke HTTP (curl.exe), todo contra DB reales:
  - `GET /health` → `{"status":"UP","persistence":"mysql+mongo"}` (200)
  - `POST /api/v1/auth/register/natural-customer` (smoke-nat-001) → 200, persistido
    (customers=2, operations=7 en MySQL tras el flujo)
  - `POST /api/v1/auth/register/user` (smokeuser001/NATURAL_CUSTOMER) → 200 (users=4)
  - `POST /api/v1/auth/login` → 200, JWT con claims (`userId`, `sub`/username, `role`)
  - `GET /natural-customer/profile` con JWT → 200
  - misma ruta sin token → 401; con token inválido → 401
  - `GET /teller/customers` con rol NATURAL_CUSTOMER → 403 (autorización por rol OK)
- integración adapters ↔ DB reales (script temporal `integration-smoke.tmp.ts`, eliminado
  tras el run, exit 0 `INTEGRATION_SMOKE_OK`): `bootstrapPersistence` + `close()` OK;
  MySQL: customer find, user find, account save/find/`findAllByOwner` OK;
  Mongo: `AuditLogMongoAdapter.save/exists/find/findAll` round-trip OK.
- limpieza: script temporal y logs de smoke eliminados; proceso del servidor smoke
  detenido (puerto 8080 liberado); datos de prueba `smoke-nat-001/smokeuser001`,
  cuenta `INT-*` y auditoría `AUD-*` quedan en los volúmenes Docker (dev).
- siguienteAccion: `REPAIR_CONTRACT` para `DELETE /api/v1/internal-analyst/loans/{loanId}`
  (`server.ts:315-317` responde 204 sin consultar ni ejecutar operación de dominio) +
  comparación REST completa vs `Api-rest-endpoints.md`.

## Run record (run-01: REPAIR_TESTS)
- runId: run-2026-09-23-repair-tests-01
- fecha (UTC): 2026-09-23
- stack: TypeScript / Node (Express + TypeORM + Mongoose + Vitest) — detectado por
  `backend/package.json`, `tsconfig.json`, `vitest.config.ts`
  (punto de entrada `application/server.ts`, scripts `build`/`test`/`start`).
  Sin señales Java (`pom.xml`/`build.gradle`/`.java`): no aplica Spring.
- fase seleccionada: `REPAIR_TESTS`
- tarea: reparar `TransferService` > `expires only transfers whose approval period elapsed`
- estado: `IN_PROGRESS` (reparación verificada; quedan gates de integración por validar
  con DB reales)
- archivos:
  - `backend/test/domain/services/TransferService.test.ts` (modificado:
    `buildTransferModel` acepta `creationDate`; test de expiración usa fechas
    relativas a `Date.now()`)
  - `backend/application/domain/services/TransferService.ts` (leído, sin cambios)
  - `backend/application/domain/models/Transfer.ts` (leído, sin cambios)
- evidencia:
  - antes: `npm test` → `Test Files 1 failed | 31 passed`, `Tests 1 failed | 173 passed (174)`
    (`test/domain/services/TransferService.test.ts:105` — `expireTransfer` resolvía en
    vez de rechazar con `InvalidTransferException`)
  - después: `npm run build` → exit 0; `npm test` → `Test Files 32 passed`,
    `Tests 174 passed (174)`, exit 0
- comando: `npm run build`, `npm test` en `backend`
- exitCode: build 0; test 0 (post-reparación)
- pruebas: unitarias 174/174; integración con MySQL/Mongo reales APROBADA (run-02:
  bootstrap, 6 tablas auto-creadas, colección `audit_logs`, smoke HTTP 200/401/403,
  adapters round-trip MySQL+Mongo, cierre de conexiones);
  E2E 0/0 (pendiente)
- bloqueos: ninguno para unitarias. Integración pendiente de validación contra DB
  reales (no se levantó `docker compose` en este run).
- siguienteAccion: `INTEGRATION_VALIDATION` — (1) `docker compose up -d`,
  (2) smoke `npm run start` + `GET /health`, login JWT y ruta protegida sin/inválido
  token, (3) pruebas de integración de adapters/persistencia, (4) revisar contrato
  `DELETE /api/v1/internal-analyst/loans/{loanId}` (ver nota `REPAIR_CONTRACT`
  candidata abajo).

## Diagnóstico (matriz §3.1)
| Área | Evidencia revisada | Estado | Acción siguiente | Validación requerida |
|---|---|---|---|---|
| Stack y dependencias | `package.json`, `tsconfig.json`, `vitest.config.ts`, `server.ts` | VERIFIED | ninguna | `npm run build` exit 0 — OK |
| Dominio | `application/domain/models|valueobjects|enums|exceptions` + tests | VERIFIED | ninguna | 174/174 — OK |
| Persistencia SQL | `adapters/persistence/typeorm/{schemas,mysql.adapters}.ts`, `infrastructure/database/{datasource,bootstrap}.ts` | IMPLEMENTED | integración MySQL real | bootstrap + CRUD + cierre |
| Persistencia Mongo | `adapters/persistence/mongoose/{auditLog.model,mongo.adapter}.ts` | IMPLEMENTED | integración Mongo real | auditoría + filtros/paginación |
| Casos de uso | `adapters/useCases/*UseCaseImpl.ts` (8 roles) | IMPLEMENTED | smoke por rol | tests `usecases-rest` + manual |
| REST | `adapters/rest/{dtos,controllers}`, `server.ts` rutas | IMPLEMENTED | contrato HTTP | comparar vs `Api-rest-endpoints.md` |
| Seguridad | `infrastructure/security/{JwtProvider,JwtAuthMiddleware,PasswordSecurityAdapter}.ts` | IMPLEMENTED | login + roles | JWT claims + 401/403 |
| Pruebas | `test/domain/**`, `test/adapters/**` | VERIFIED (unitarias) | integración/E2E | comandos reales con DB |

Decisión (§3.1, orden): build OK → había 1 prueba fallida → se seleccionó
`REPAIR_TESTS`. Causa raíz: fecha fija de prueba `NOW = 2026-08-24` vs
`Date.now()` real (2026-09-23) en `TransferService.hasApprovalExpirationPeriodElapsed`
(§6.1: prohibido fechas fijas que caduquen). Reparación mínima solo en el test, con
fechas relativas controladas (`new Date()` para reciente,
`Date.now() - 25h` para expirado). Sin cambios al dominio (idempotencia §3.3).

## Puertos / configuración (§0B.3)
- `docker-compose.yml` publica `3308:3306` (MySQL) y `27017:27017` (Mongo).
- `.env.example` (canónico, versionado): `MYSQL_PORT=3306`,
  `MONGO_URI=mongodb://localhost:27017/audit_db` — conforme al SDD §4.1.
- `.env` (local, gitignored — ver `.gitignore:69`): `MYSQL_PORT=3308` con comentario
  documentando el motivo: conflicto con `mysqld` nativo en 3306, contenedor `bank-mysql`.
- `appConfig.ts` lee `MYSQL_PORT` del entorno (defecto 3306). Decisión registrada:
  combinación `3308:3306` + `MYSQL_PORT=3308` aceptada como override local documentado;
  el canónico SDD sigue siendo `3306:3306`. No se modificó `docker-compose.yml` para no
  romper el entorno local. Integración debe validar con el puerto efectivo del entorno.

## Trazabilidad mínima (§5.2)
| Requisito/contrato SDD | Archivo o símbolo | Prueba/comando | Estado | Evidencia |
|---|---|---|---|---|
| Dominio: modelos/VOs/excepciones | `application/domain/models/*`, `valueobjects/*`, `exceptions/*` | `npm test` | VERIFIED | 174/174, exit 0 |
| Transfer expiración (relativa) | `TransferService.expireTransfer` + `TransferService.test.ts` | `npm test` | VERIFIED | falla antes / pasa después |
| Persistencia SQL (TypeORM, `synchronize: true`) | `adapters/persistence/typeorm/*`, `datasource.ts`, `bootstrap.ts` | integración MySQL real (run-02) | VERIFIED | 6 tablas auto-creadas; account save/find/findAllByOwner OK; close OK |
| Auditoría Mongo | `adapters/persistence/mongoose/*` | integración Mongo real (run-02) | VERIFIED | colección `audit_logs`; save/exists/find/findAll round-trip OK |
| Auth JWT (claims `userId,username,role,email`) | `JwtProvider`, `JwtAuthMiddleware` | `security.test.ts` + smoke login (run-02) | VERIFIED | login 200 + JWT con claims; profile 200 |
| Autorización por rol | `AuthorizationService`, `requireRole` en `server.ts` | `security.test.ts` + smoke 401/403 (run-02) | VERIFIED | sin token 401; inválido 401; rol incorrecto 403 |
| REST por rol | `adapters/rest/controllers/controllers.ts`, `server.ts` | `usecases-rest.test.ts` + contrato | IMPLEMENTED | unitaria OK; contrato pendiente |
| Containerización (Fase 0C) | `backend/Dockerfile`, `.dockerignore`, `docker-compose.yml` (bank-api), `tsconfig.build.json`, `README.md` | `docker compose config/build --no-cache/up/ps/down` + smoke | VERIFIED | build 0; 3/3 healthy; smoke 200/401/403; re-up limpio OK |
| `DELETE /api/v1/internal-analyst/loans/{loanId}` → 204 | `server.ts` (resolveLoan+closeLoan) vs `Api-rest-endpoints.md:483-487` | smoke Docker bug 204 → fix 404 | VERIFIED | consulta recurso + cierra dominio (CLOSED, Operation+Audit) |
| Global Exception Handler | `adapters/rest/middleware/errorHandler.ts`, `server.ts`, `test/adapters/errorHandler.test.ts` | build 0 + 198/198 + smoke HTTP | VERIFIED | 400/401/403/404/409/503/500, shape, requestId, headersSent, JSON malformado |
| Contrato REST (códigos + CRUD) | `server.ts` (`run` envelopes), `controllers.ts`, DELETE fix, Create&Execute, balance, audit page/size | smoke Docker + E2E curl | VERIFIED | 35/35 endpoints; 201/202/204/200; DELETE 404 real; EXECUTED E2E; 409 fondos; audit paginado |

## Nota candidata a `REPAIR_CONTRACT` (no abordada en este run)
`server.ts:315-317` responde `204` sin consultar el recurso ni ejecutar operación de
dominio de cancelación/cierre. §6.1 exige: consultar el recurso y ejecutar la operación
de dominio equivalente, o crearla si no existe. Siguiente agente debe: (a) verificar si
`LoanService` expone cancel/close aplicable, (b) cablear `resolveLoan` + caso de uso en
el handler, (c) añadir prueba que falle antes (recurso existente no consultado / sin
efecto en dominio) y pase después, (d) confirmar `204` + códigos de error según SDD.

## Informe de cierre (§5.1)
```text
Estado: COMPLETE
Stack validado: TypeScript/Node (Express + TypeORM + Mongoose + Vitest)
Fase seleccionada y motivo: run-05 — últimos faltantes (compensación, push-down Mongo, E2E); los 12 criterios §5 verificados con evidencia reciente
Cambios realizados: compensación multi-recurso, findPaged, E2E automatizado, 404 catch-all, README (detalle en run-05)
Comandos ejecutados y códigos de salida: build 0; test 0 (202/202, 33 ficheros); test:e2e 0 (13/13); compose build 0; up 3/3 healthy; down 0; re-up healthy + /health UP + E2E 13/13
Pruebas: unitarias 258/258; cobertura 99.97/96.44/99.83; integración real APROBADA; E2E 13/13 (unit 258 + e2e 13 = 271 verificaciones)
Docker: build OK; 3/3 healthy; smoke + E2E OK; apagado y rearranque limpio OK (×2)
Gates aprobados: §5.1–§5.12 todos (ver tabla por fases y dictamen run-05)
Faltantes o bloqueos: ninguno exigible (mejoras no bloqueantes: transacciones distribuidas, documentar 6 rutas extra en SDD)
Siguiente acción exacta: operar (`docker compose up -d`); regressión con `npm test` + `npm run test:e2e`
```
