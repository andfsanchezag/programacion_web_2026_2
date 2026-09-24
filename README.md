# Aurora Banco

Aurora Banco is a full-stack banking information management system built as a portfolio-grade demonstration of domain-driven design, hexagonal architecture, secure REST integration and Docker-first delivery.

The project models real banking workflows for customers, companies and internal employees: accounts, balances, loans, transfers, approvals, authentication, authorization and immutable audit records.

> Aurora Banco uses an original visual identity inspired by digital banking patterns. It does not use Bancolombia names, logos, proprietary assets or copied screens.

## Project Status

The backend is validated with TypeScript build/tests, Docker, MySQL, MongoDB, JWT, CORS and REST smoke flows. The React frontend includes role-based modules, JWT session handling, backend adapters, SweetAlert2 feedback, responsive layouts and visual evidence. Remaining work is tracked in the frontend orchestrator state, including any backend-blocked subfeatures and final delivery checks.

## Highlights

- Role-based banking platform with seven operational roles.
- Domain-driven business model with entities, value objects, domain services and explicit exceptions.
- Hexagonal architecture with input ports, output ports and technology adapters.
- MySQL persistence through TypeORM.
- MongoDB persistence for audit logs through Mongoose.
- JWT authentication and role authorization.
- Global REST exception handling with stable error codes and request correlation IDs.
- Central request validation and deterministic HTTP status mapping.
- React + TypeScript frontend with dashboards and workflows per role.
- Docker Compose environment that starts frontend, backend, MySQL and MongoDB together.
- Unit, integration, live smoke, E2E and screenshot-based validation.
- Responsive and accessible UI validation at mobile, tablet and desktop viewports.

## Architecture

```text
                           +----------------------+
                           | React Frontend       |
                           | frontend/             |
                           | adapters + role UX    |
                           +----------+-----------+
                                      |
                         HTTP + JWT + CORS
                                      |
                                      v
                           +----------------------+
                           | Express Backend      |
                           | backend/src/         |
                           | REST + application   |
                           +----+------------+----+
                                |            |
                           TypeORM        Mongoose
                                |            |
                                v            v
                         +-----------+  +-----------+
                         | MySQL     |  | MongoDB   |
                         | bank_db   |  | audit_db  |
                         +-----------+  +-----------+
```

### Architectural patterns

- Domain-Driven Design: business concepts are represented as domain entities, value objects and services.
- Hexagonal architecture: domain logic depends on ports, never on databases or HTTP frameworks.
- Ports and adapters: persistence, REST, security and configuration are replaceable adapters.
- Dependency inversion: use cases coordinate domain services through contracts.
- Anti-corruption boundaries: DTOs and persistence documents are mapped before entering the domain.
- Explicit error taxonomy: validation, authentication, authorization, not-found, conflict, dependency and internal errors use stable categories.
- Docker-first development: all application execution and validation happens through containers.

## Technology Stack

Aurora Banco uses TypeScript end to end, but separates browser delivery, application orchestration, business rules and persistence. The technologies below are deliberately assigned to specific architectural boundaries.

### Backend technologies

| Technology | Version in project | Role | Boundary and rationale |
|---|---:|---|---|
| TypeScript | `^4.0.0` | Static typing for the API, domain models, ports, DTOs and adapters. | Shared contracts are explicit at compile time. Runtime HTTP data is still validated at the REST boundary. |
| Node.js | Docker runtime | Executes the backend application and asynchronous I/O. | Infrastructure runtime only; domain services do not depend on Node globals. |
| Express | `^4.22.2` | HTTP server, routing and middleware pipeline. | REST adapters translate requests into input-port calls; Express does not contain banking rules. |
| TypeORM | `^1.1.1` | Relational persistence abstraction. | Implements output ports and maps operational data to MySQL without leaking ORM entities into the domain. |
| `mysql2` | `^3.24.4` | MySQL driver used by the relational adapter. | Infrastructure detail below TypeORM. Controllers and domain services never call it directly. |
| MySQL | Docker image `8.0` | Transactional operational data. | Stores customers, users, accounts, loans, transfers and related relational state. |
| Mongoose | `^6.13.11` | Document persistence abstraction for audit data. | Implements the audit output port and maps audit events to MongoDB documents. |
| MongoDB | Docker image `6.0` | Audit and operational history. | Stores append-oriented audit records independently from transactional banking aggregates. |
| JWT | API security boundary | Carries authenticated identity and role claims. | The API signs and verifies tokens; authorization is enforced server-side for every protected operation. |
| `dotenv` | `^17.4.2` | Loads environment-based runtime configuration. | Keeps ports, database connections and policy thresholds outside source code. |
| Vitest | `^3.2.7` | Backend unit, integration and end-to-end-oriented test execution. | Verifies domain rules, adapters and live behavior according to the selected test configuration. |
| V8 coverage | `@vitest/coverage-v8` | Coverage reporting for backend tests. | Provides evidence about tested branches without replacing behavioral tests. |

#### Backend technology flow

```text
HTTP request
  -> Express middleware and REST controllers
  -> DTO validation and mappers
  -> role input port
  -> use-case implementation
  -> domain entities, value objects and services
  -> output port
  -> TypeORM/MySQL or Mongoose/MongoDB adapter
  -> response mapper and HTTP response
```

### Frontend technologies

| Technology | Version in project | Role | Boundary and rationale |
|---|---:|---|---|
| React | `^19.2.8` | Component rendering and interaction state. | Owns presentation and user interaction, not authoritative banking invariants. |
| React DOM | `^19.2.8` | Mounts the React application in the browser. | Browser delivery boundary for the component tree. |
| TypeScript | `~6.0.2` | Types frontend models, ports, services, adapters and component props. | Keeps client contracts explicit while runtime responses remain mapped and checked. |
| Vite | `^8.3.0` | Development server and production asset build. | Produces static assets that are served by Nginx in the runtime image. |
| `@vitejs/plugin-react` | `^6.1.1` | React transform integration for Vite. | Connects React source conventions with the Vite build pipeline. |
| React Router DOM | `^7.18.4` | URL routing, protected navigation and role-based screen selection. | Organizes user flows; it is not a replacement for backend authorization. |
| SweetAlert2 | `^11.26.25` | Confirmation, success and error feedback. | Centralized alert adapter prevents pages from duplicating feedback behavior. |
| Testing Library | `@testing-library/react` `^16.3.3` | Component and interaction testing from the user's perspective. | Assertions focus on visible behavior, labels, roles and outcomes. |
| Jest DOM | `^7.0.1` | DOM-specific assertions for frontend tests. | Makes accessibility and rendered-state assertions readable. |
| Vitest | `^5.0.1` | Frontend unit, component and live test scripts. | Runs fast local checks and live flows against the Docker API. |
| Oxlint | `^1.81.0` | Frontend static analysis. | Finds common correctness and maintainability issues before runtime checks. |
| Playwright Core | `^1.63.0` | Browser automation for screenshot evidence. | Captures responsive visual evidence at mobile, tablet and desktop widths. |
| Nginx | Docker runtime image | Serves compiled Vite assets. | Keeps the production frontend image focused on static delivery rather than development tooling. |

#### Frontend technology flow

```text
Browser interaction
  -> React route and role module
  -> application service or view model
  -> frontend domain port
  -> HTTP adapter + session adapter
  -> Express API with Bearer JWT
  -> mapped response or typed error
  -> React state update + SweetAlert2 feedback
```

### Platform and delivery technologies

| Technology | Role in this project | Operational detail |
|---|---|---|
| Docker | Packages backend and frontend with reproducible runtime dependencies. | Backend and frontend commands run inside images; host Node/npm installation is not required. |
| Docker Compose v2 | Describes the complete local topology. | Starts `frontend`, `bank-api`, `mysql-db` and `mongo-db` on the `bank-net` bridge network. |
| Docker health checks | Coordinates startup readiness. | API waits for healthy MySQL and MongoDB; frontend waits for the API health endpoint. |
| MySQL named volume | Persists operational data across container restarts. | Compose volume: `mysql_data`. |
| MongoDB named volume | Persists audit data across container restarts. | Compose volume: `mongo_data`. |
| CORS | Allows the browser origin at `localhost:5173` to call the API at `localhost:8080`. | Browser policy only; it does not replace JWT authentication or role authorization. |
| HTTP/JSON | Transport between frontend and backend. | DTOs, mappers, stable error codes and `X-Request-Id` make the boundary observable. |

Detailed responsibilities, interactions and decisions are documented in the [C4 architecture document](docs/c4-architecture.md).

## Repository Structure

```text
.
├── backend/
│   ├── src/application/
│   ├── test/
│   ├── scripts/
│   ├── Dockerfile
│   ├── package.json
│   └── INSTRUCTIONS.md
├── frontend/
│   ├── src/
│   │   ├── adapters/
│   │   ├── app/
│   │   ├── application/
│   │   ├── components/
│   │   ├── domain/
│   │   ├── modules/
│   │   └── styles/
│   ├── test/
│   │   └── screenshots/
│   ├── Dockerfile
│   ├── package.json
│   └── INSTRUCTIONS.md
├── backendSDD/
├── frontendSDD/
├── docker-compose.yml
├── INSTRUCTIONS.md
└── LICENSE
```

## Backend Capabilities

The backend exposes workflows for:

- Public login and registration.
- Natural customer profile, accounts, loans, payments, transfers and operations.
- Business customer profile, delegated users and transfer approvals.
- Business operator accounts and high-value transfers.
- Business supervisor approval queues.
- Teller customer search, account management, deposits and withdrawals.
- Commercial employee customer loan requests.
- Internal analyst employee management, customer status, loan lifecycle and audit logs.

Protected endpoints require a JWT. The backend returns a uniform error envelope with a stable error code and `X-Request-Id` correlation value.

## Frontend Experience

The frontend presents an original banking experience under the Aurora Banco identity:

- Login and registration flows with field validation.
- Role-based protected navigation.
- Product summary dashboards.
- Account, loan and transfer workflows.
- Loading skeletons, empty states and retry actions.
- SweetAlert2 confirmations for financial and destructive operations.
- Error feedback for `401`, `403`, `404`, `409`, `503` and `500` responses.
- Responsive layouts for 360px, 768px and 1440px viewports.
- Accessibility checks for labels, keyboard navigation, focus order, contrast and reduced motion.

## Running the Complete Stack

Docker Compose is the only supported execution path. Start Docker Desktop first.

From the repository root:

```powershell
docker compose config --quiet
docker compose build --no-cache
docker compose up -d
docker compose ps
```

Open:

- Frontend: http://localhost:5173
- Backend health: http://localhost:8080/health

Expected services:

| Service | Purpose | Address |
|---|---|---|
| `frontend` | React application served by Nginx | `localhost:5173` |
| `bank-api` | Express REST API | `localhost:8080` |
| `mysql-db` | Relational persistence | host `3308`, container `3306` |
| `mongo-db` | Audit persistence | `localhost:27017` |

Inspect logs:

```powershell
docker compose logs --tail=200 bank-api
docker compose logs --tail=200 frontend
docker compose logs --tail=200 mysql-db
docker compose logs --tail=200 mongo-db
```

Stop the stack while preserving data:

```powershell
docker compose down
```

Delete database volumes only intentionally:

```powershell
docker compose down -v
```

## Validation

Backend tests inside Docker:

```powershell
docker compose exec bank-api npm test
```

Backend seed data:

```powershell
docker compose exec bank-api npm run seed
```

Frontend validation image:

```powershell
docker build --target build --build-arg VITE_API_BASE_URL=http://localhost:8080 -t aurora-frontend-validation ./frontend
docker run --rm aurora-frontend-validation npm run lint
docker run --rm aurora-frontend-validation npm test -- --run
```

Frontend live tests:

```powershell
docker run --rm --network host -e LIVE_BASE_URL=http://localhost:8080 aurora-frontend-validation npm run test:live
```

Screenshot evidence:

```powershell
docker run --rm -v "${PWD}/frontend/test/screenshots:/app/test/screenshots" aurora-frontend-validation npm run shots
```

Visual evidence is stored under `frontend/test/screenshots/` and includes mobile, tablet and desktop viewports.

## Documentation

- C4 architecture: [docs/c4-architecture.md](docs/c4-architecture.md).
- Backend contracts: [backendSDD](backendSDD/).
- Frontend contracts: [frontendSDD](frontendSDD/).
- Backend implementation guide: [backend/INSTRUCTIONS.md](backend/INSTRUCTIONS.md).
- Frontend implementation guide: [frontend/INSTRUCTIONS.md](frontend/INSTRUCTIONS.md).
- Repository-wide instructions: [INSTRUCTIONS.md](INSTRUCTIONS.md).
- Backend orchestrator: [backendSDD/Backend-orchestrator-prompt.md](backendSDD/Backend-orchestrator-prompt.md).
- Frontend orchestrator: [frontendSDD/Frontend-orchestrator-prompt.md](frontendSDD/Frontend-orchestrator-prompt.md).

## Author

**andfsanchezag**

This project was developed as a portfolio-oriented demonstration of full-stack TypeScript, domain modeling, clean architecture, secure API design and Docker-based delivery.

## License

This project is distributed under the license defined in [LICENSE](LICENSE).
