# Repository Instructions

## 1. Scope

This repository contains a Docker Compose banking application with:

- `backend/`: backend source, tests and Docker build context.
- `frontend/`: React frontend source, tests and Docker build context.
- `backendSDD/`: backend contracts and backend orchestrator state.
- `frontendSDD/`: frontend contracts and frontend orchestrator state.
- `docker-compose.yml`: complete local environment.

Backend-specific rules are in `backend/INSTRUCTIONS.md`. Frontend-specific rules are in `frontend/INSTRUCTIONS.md`.

## 2. Docker-only execution

Docker Compose is the only supported way to install, build, run and validate the complete project. Do not run Node.js, npm, Vite, Vitest, TypeScript or the backend directly on the host.

Start Docker Desktop before any command.

From the repository root:

```powershell
docker compose config --quiet
docker compose build --no-cache
docker compose up -d
docker compose ps
```

Expected services:

- `frontend`: `http://localhost:5173`
- `bank-api`: `http://localhost:8080`
- `mysql-db`: host `3308`, container `3306`
- `mongo-db`: `localhost:27017`

The frontend browser calls the backend through `http://localhost:8080`. Internal backend database connections use Compose service names, never `localhost`.

### 2.1. Levantamiento completo paso a paso

Desde la raíz del repositorio:

1. Iniciar Docker Desktop.
2. Validar la configuración Compose:

```powershell
docker compose config --quiet
```

3. Construir todas las imágenes sin usar caché:

```powershell
docker compose build --no-cache
```

4. Levantar frontend, backend, MySQL y MongoDB:

```powershell
docker compose up -d
```

5. Confirmar que los cuatro servicios estén saludables:

```powershell
docker compose ps
```

6. Validar backend:

```powershell
Invoke-RestMethod http://localhost:8080/health
```

7. Abrir frontend en `http://localhost:5173`.
8. Revisar logs si algún servicio no está saludable:

```powershell
docker compose logs --tail=200 bank-api
docker compose logs --tail=200 frontend
docker compose logs --tail=200 mysql-db
docker compose logs --tail=200 mongo-db
```

9. Para reconstruir y reiniciar todo después de un cambio:

```powershell
docker compose down
docker compose up -d --build
```

`docker compose up -d --build` reconstruye y levanta la aplicación, pero no sustituye las pruebas del apartado 4.

## 3. Health and logs

Check the complete stack:

```powershell
docker compose ps
Invoke-RestMethod http://localhost:8080/health
```

Inspect logs:

```powershell
docker compose logs -f bank-api
docker compose logs -f frontend
```

Stop following logs with `Ctrl+C`.

## 4. Docker-only validation

La validación debe ejecutarse después de que el stack esté saludable. El orden recomendado es: backend unitario, frontend lint/build, pruebas frontend, smoke live, screenshots y finalmente pruebas E2E.

Backend validation:

```powershell
docker compose exec bank-api npm run build
docker compose exec bank-api npm test
```

Frontend validation image:

```powershell
docker build --target build --build-arg VITE_API_BASE_URL=http://localhost:8080 -t aurora-frontend-validation ./frontend
docker run --rm aurora-frontend-validation npm run lint
docker run --rm aurora-frontend-validation npm test -- --run
```

Frontend live tests, with the backend already running:

```powershell
docker run --rm --network host -e LIVE_BASE_URL=http://localhost:8080 aurora-frontend-validation npm run test:live
```

Frontend screenshot evidence:

```powershell
docker run --rm -v "${PWD}/frontend/test/screenshots:/app/test/screenshots" aurora-frontend-validation npm run shots
```

Seed backend development data:

```powershell
docker compose exec bank-api npm run seed
```

Do not use host `npm` commands as a fallback. If a command cannot run in the current image, update the Docker validation target or Compose validation service.

## 5. Environment and secrets

- Never commit `.env` files, passwords, JWT secrets or production credentials.
- Use `.env.example` files as documentation only.
- Development Compose values must remain clearly marked as development values.
- CORS must allow the configured frontend origin only, normally `http://localhost:5173`.
- The frontend must never receive backend database credentials or JWT signing secrets.

## 6. SDD authority

Before changing code, read the relevant contracts:

- Backend: `backendSDD/`.
- Frontend: `frontendSDD/`.
- Cross-stack alignment: `backendSDD/Contract-alignment.md`.

When code and SDD disagree:

1. Stop the affected task.
2. Mark it `REPAIR_CONTRACT` or `BLOCKED`.
3. Record the discrepancy and affected files.
4. Repair the contract or implementation deliberately.
5. Re-run the relevant Docker validation.

Do not invent endpoints, DTOs, roles, error codes, JWT claims or database behavior.

## 7. Change workflow

1. Inspect the current state and preserve user changes.
2. Identify the smallest affected layer.
3. Edit only the owned application folder or SDD scope.
4. Validate first with the narrowest Docker command that can disprove the change.
5. Run build, tests and integration checks affected by the change.
6. Update the appropriate state file:
   - `backendSDD/orchestrator-state.md`;
   - `frontendSDD/frontend-orchestrator-state.md`.
7. Record commands, exit codes, test counts, screenshots and blockers.

Never use destructive Git commands such as reset or checkout to discard work.

## 8. Completion gate

The repository cannot be reported as complete until all conditions pass:

- `docker compose config --quiet` succeeds.
- Complete Compose build succeeds.
- `frontend`, `bank-api`, MySQL and MongoDB are healthy.
- Backend build and tests pass.
- Frontend build, lint and tests pass.
- Backend/frontend live smoke tests pass.
- JWT and CORS are verified.
- All documented user-facing endpoints are mapped and tested.
- Every role has its module and main user journey.
- Screenshots exist for loading, loaded, empty, error, confirmation and success states at mobile and desktop viewports.
- Accessibility and reduced-motion checks pass.
- No unresolved `REPAIR_BACKEND`, `BLOCKED`, `untested` or undocumented endpoint remains.
- State files contain current evidence and no obsolete claim such as `0/7 modules` when modules exist.

The only valid final states are:

```text
COMPLETE
IN_PROGRESS
BLOCKED
```
