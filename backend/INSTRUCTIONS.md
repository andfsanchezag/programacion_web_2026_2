# Backend Instructions

## 1. Prerequisites

Install and start only Docker Desktop with Docker Compose v2. Node.js and npm run inside Docker and are not required on the host.

The backend uses TypeScript, Express, TypeORM, MySQL, MongoDB, JWT and Vitest.

## 2. Recommended startup with Docker

From the repository root:

```powershell
docker compose build --no-cache bank-api
docker compose up -d
```

Check the services:

```powershell
docker compose ps
```

Expected services:

- `bank-api`: `http://localhost:8080`
- MySQL: host port `3306`, container port `3306`
- MongoDB: `localhost:27017`

The application connects internally to `mysql-db:3306` and `mongo-db:27017`.

## 3. Health check

```powershell
Invoke-RestMethod http://localhost:8080/health
```

Expected response:

```json
{
  "status": "UP",
  "persistence": "mysql+mongo"
}
```

Inspect API logs:

```powershell
docker compose logs -f bank-api
```

Press `Ctrl+C` to stop following logs.

## 4. Docker-only rule

Do not run `npm`, `tsx`, TypeScript, Vitest or the server directly on the host. All backend commands must run through Docker Compose. Do not install backend dependencies outside the image.

## 5. Seed development data

With Docker services and the API available:

```powershell
docker compose exec bank-api npm run seed
```

The seed creates development customers, employees, accounts, loans, transfers and audit records. Use only in development environments.

Seed credentials use the password documented by the seed process. Never reuse them in production.

## 6. Tests

Unit and adapter tests:

```powershell
docker compose exec bank-api npm test
```

Coverage:

```powershell
docker compose exec bank-api npm run coverage
```

End-to-end tests require the Docker environment:

```powershell
docker compose exec bank-api npm run test:e2e
```

Run tests inside the container only when development dependencies are present in the image:

```powershell
docker compose exec bank-api npm test
```

## 7. Configuration

Use `.env.example` as the runtime variable contract. Compose injects the actual container values. Important variables:

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MONGO_URI`
- `PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `FRONTEND_ORIGIN`
- `TRANSFER_APPROVAL_THRESHOLD`
- `TRANSFER_APPROVAL_EXPIRATION_HOURS`

Never commit `.env` or production secrets.

## 8. Backend workflow

1. Read the relevant SDD in `backendSDD/`.
2. Inspect existing implementation and tests before editing.
3. Make the smallest change required.
4. Run the narrowest relevant test through `docker compose exec`.
5. Run `docker compose build --no-cache bank-api`.
6. Run `docker compose exec bank-api npm test`.
7. If REST, database, CORS or Docker behavior changed, run the appropriate integration/E2E checks.
8. Update `backendSDD/orchestrator-state.md` with evidence and exit codes.

## 9. Shutdown and cleanup

Stop services while preserving database volumes:

```powershell
docker compose down
```

Delete containers and database data only intentionally:

```powershell
docker compose down -v
```

## 10. Common problems

- Port `3306` occupied: keep MySQL host port `3308`; the application container always uses `mysql-db:3306`.
- API unhealthy: inspect `docker compose logs bank-api`.
- Database connection failure: verify MySQL/Mongo health with `docker compose ps`.
- Test imports fail after moving files: rebuild the image and verify imports use `src/application` inside the container.
- CORS failure: verify `FRONTEND_ORIGIN=http://localhost:5173` and restart `bank-api`.
