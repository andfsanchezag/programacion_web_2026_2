# Frontend Instructions

## 1. Prerequisites

Use Docker Desktop with Docker Compose v2. Node.js and npm run inside Docker and are not required on the host. The backend must be available at `http://localhost:8080` through Docker.

The frontend uses React, TypeScript, Vite, React Router, SweetAlert2, Vitest and Playwright-based screenshot tooling.

## 2. Docker-only rule

Do not run `npm`, Vite, Vitest or Node directly on the host. Do not install frontend dependencies outside Docker. The lockfile is consumed by the image build.

## 3. Configure the backend URL

The Docker build argument must use:

```text
VITE_API_BASE_URL=http://localhost:8080
```

Do not place JWT secrets, passwords or backend private configuration in frontend environment variables.

## 4. Build and serve the complete stack

From the repository root, build and start frontend, backend, MySQL and MongoDB together:

```powershell
docker compose build --no-cache
docker compose up -d
docker compose ps
```

Open:

```text
http://localhost:5173
```

The backend must already be running and must allow this origin through CORS.

## 5. Build and validation image

```powershell
docker build --target build --build-arg VITE_API_BASE_URL=http://localhost:8080 -t aurora-frontend-validation ./frontend
docker run --rm aurora-frontend-validation npm run lint
docker run --rm aurora-frontend-validation npm test -- --run
```

## 6. Lint and tests

Run lint in the validation image:

```powershell
docker run --rm aurora-frontend-validation npm run lint
```

Run unit/component tests:

```powershell
docker run --rm aurora-frontend-validation npm test -- --run
```

Run live smoke tests against the backend:

```powershell
docker run --rm --network host -e LIVE_BASE_URL=http://localhost:8080 aurora-frontend-validation npm run test:live
```

Live tests require:

- Docker services and backend running.
- Seed development accounts available.
- `LIVE_BASE_URL` set when the backend is not at the default URL.

The backend and its databases must already be running through Docker Compose.

## 7. Screenshot and accessibility evidence

Generate screenshots and visual evidence:

```powershell
docker run --rm -v "${PWD}/test/screenshots:/app/test/screenshots" aurora-frontend-validation npm run shots
```

Screenshots are stored in:

```text
frontend/test/screenshots/
```

Available viewports include:

- `360x800`
- `768x1024`
- `1440x900`

Review `test/screenshots/report.json` for the latest accessibility and visual results.

## 8. Main user flows to verify

1. Login with valid and invalid credentials.
2. Login validation with empty/invalid fields.
3. Session persistence and logout.
4. Redirect to the correct dashboard by JWT role.
5. Natural customer: profile, accounts, loans, operations and transfers.
6. Business customer: delegated users and transfer approvals.
7. Business operator: company accounts and transfers.
8. Business supervisor: pending transfer queue and approval actions.
9. Teller: customer search, account operations, deposits and withdrawals.
10. Commercial employee: customer lookup and loan request.
11. Internal analyst: employees, customer status, loans and audit.
12. `401`, `403`, `404`, `409`, `503` and unexpected error alerts.

## 9. Frontend development rules

- Keep all HTTP calls inside `src/adapters/http` and application services.
- Send `Authorization: Bearer <token>` on every protected request.
- Store only the safe session/token data defined by the SDD; never store passwords.
- Use `SweetAlert2` through the alert adapter, not directly in every component.
- Preserve form values after recoverable errors.
- Use loading, empty, success, error and retry states for remote resources.
- Keep role access enforced by route guards and by the backend.
- Do not use third-party corporate logos, names or proprietary assets.
- Preserve the Aurora Banco visual identity and design tokens.

## 10. Frontend workflow

1. Read the relevant SDD in `frontendSDD/` and backend contracts in `backendSDD/`.
2. Inspect the existing feature/module before editing.
3. Implement the smallest coherent change.
4. Run the closest test through a Docker validation container.
5. Run the Docker build and validation image checks.
6. Run live tests through a Docker validation container.
7. Run screenshot generation through Docker when visual or responsive behavior changes.
8. Update `frontendSDD/frontend-orchestrator-state.md` with evidence, screenshots and exit codes.

## 11. Frontend Docker

The root Compose includes the frontend service. Validate the complete stack:

```powershell
docker compose build frontend
docker compose up -d frontend
docker compose ps
```

Expected URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`
- MySQL: host `3308`, container `3306`
- MongoDB: `27017`

Stop the complete stack without deleting data:

```powershell
docker compose down
```

The browser-facing frontend uses `http://localhost:8080` for the API in development. Container networking must follow the Compose contract and must not expose backend secrets.
