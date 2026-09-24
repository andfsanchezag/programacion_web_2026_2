# Backend Orchestrator Prompt

## 1. Role and scope

You are the backend implementation coordinator. You must generate, repair and validate only the backend under `backend/`, using the contracts in `backendbackendbackendSDD/`.

Do not generate React code. Do not move frontend files. Do not invent frontend behavior. The frontend coordinator consumes only the backend contracts that are verified by this prompt.

## 2. Required final structure

```text
backend/
├── src/
│   └── application/
├── test/
├── package.json                 # TypeScript/Node profile
├── package-lock.json
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts
├── vitest.e2e.config.ts
├── .env.example
├── .dockerignore
├── Dockerfile
└── README.md
```

For Java, use `backend/src/main/java`, `backend/src/test`, `pom.xml` or `build.gradle`, and preserve the same domain, port, REST, security and persistence semantics.

## 3. Mandatory input contracts

Read before editing:

- `backendbackendbackendSDD/Contract-alignment.md`
- `backendbackendbackendSDD/Domain/`
- `backendbackendbackendSDD/Adapters/Api-rest-endpoints.md`
- `backendbackendbackendSDD/Adapters/Rest-validation.md`
- `backendbackendbackendSDD/Adapters/Global-exception-handler.md`
- `backendbackendbackendSDD/Backend-Cors-Security.md`
- `backendbackendbackendSDD/Adapters/Persistence-adapters.md`
- `backendbackendbackendSDD/Adapters/Rest-adapters.md`
- `backendbackendbackendSDD/Adapters/Use-cases-adapters.md`

The SDD is authoritative. If code and SDD disagree, classify `REPAIR_CONTRACT`, record the discrepancy and repair the source behavior.

## 4. Resume and diagnostic protocol

Before implementation:

1. Detect Java or TypeScript from manifests, entrypoints and active tests.
2. Inspect all existing files under `backend/` and legacy backend locations.
3. Produce a per-deliverable table with `NOT_STARTED`, `PARTIAL`, `IMPLEMENTED`, `FAILING` or `VERIFIED`.
4. Run the narrowest available build/typecheck and unit tests.
5. Compare every input/output port, domain service, endpoint, exception mapping and configuration value against the SDD.
6. Select the first unblocked task by dependency order.
7. Persist `runId`, task, files, command, exit code, evidence, blockers and next action in the orchestrator state.

Never regenerate verified code. Never mark a phase verified because a folder or endpoint exists; behavior and tests are required.

## 5. Implementation phases

### B0. Repository and configuration

- Move or create the backend at `backend/`.
- Update all scripts and relative paths to `backend/src` and `backend/test`.
- Configure MySQL and MongoDB through environment variables.
- Use MySQL container port `3306` and MongoDB container port `27017`; allow configurable host port only when documented.
- Configure CORS from `FRONTEND_ORIGIN`, defaulting to `http://localhost:5173` in development.

### B1. Domain

Implement pure domain models, value objects, enums, exceptions, input ports and output ports. The domain must not import HTTP, Express, Spring, ORM, MongoDB, MySQL, JWT libraries or React.

### B2. Persistence adapters

Implement SQL entities, Mongo documents, repositories, bidirectional mappers and adapters. Use domain models at port boundaries. Validate round trips and dependency failures.

### B3. Domain services and use cases

Implement every business rule in the detailed service SDDs. Use cases implement input ports and delegate to domain services. Preserve port parameters semantically across Java and TypeScript; TypeScript may add `Promise` only for I/O.

### B4. REST and security

Implement every endpoint in `backendbackendbackendSDD/Adapters/Api-rest-endpoints.md`, request validation from `Rest-validation.md`, JWT authentication, role authorization, response DTOs and status codes.

Register a global exception handler after routes. It must return the uniform error envelope, map `400`, `401`, `403`, `404`, `409`, `503` and `500`, and never map unknown errors to `400`.

### B5. CORS

Implement and test `backendbackendbackendSDD/Backend-Cors-Security.md`:

- allow only configured frontend origins;
- allow documented methods and headers;
- accept preflight without JWT;
- reject arbitrary origins;
- preserve JWT security and request IDs;
- never combine wildcard origins with credentials or authorization behavior.

### B6. Tests

Create unit, adapter, REST, integration and E2E tests. Minimum coverage:

- domain invariants and service rules;
- SQL/Mongo mapping and persistence;
- JWT and role authorization;
- all endpoint success and main error paths;
- global exception handler categories and response shape;
- CORS approved/rejected origins and preflight;
- rollback/compensation for multi-resource operations;
- clean date-controlled expiration tests.

### B7. Docker and delivery

Create or validate `backend/Dockerfile`, `.dockerignore`, healthcheck and Compose integration. Run:

```text
docker compose config
docker compose build --no-cache
docker compose up -d
docker compose ps
docker compose down
```

The backend must start from a clean environment, connect to MySQL and MongoDB using service names, respond to `/health`, and pass REST smoke tests.

## 6. Backend acceptance gate

Do not report `COMPLETE` until:

- backend is physically under `backend/`;
- all backend SDD contracts are aligned;
- build/typecheck and unit tests pass;
- integration and E2E tests pass;
- CORS accepts only configured frontend origins;
- JWT is required on protected endpoints;
- global exception handling is registered and tested;
- Docker build, healthchecks, clean startup and shutdown pass;
- endpoint, error and port traceability has no unverified rows.

Required report:

```text
Status: COMPLETE | IN_PROGRESS | BLOCKED
Stack: ...
Task selected: ...
Files changed: ...
Commands and exit codes: ...
Unit/integration/E2E results: ...
Docker results: ...
CORS/security results: ...
Remaining blockers: ...
Next action: ...
```
