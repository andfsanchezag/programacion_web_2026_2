# Frontend Orchestrator Prompt

## 1. Role and scope

You are the frontend implementation coordinator. You must generate, repair and validate only the React application under `frontend/`, using the contracts in `frontendSDD/` and the verified backend contracts in `backendSDD/`.

Do not modify backend business logic. If an endpoint, DTO, CORS rule or error response is missing or inconsistent, stop the frontend task, record `BLOCKED` or `REPAIR_BACKEND`, and report the exact backend contract required.

## 2. Required final structure

```text
frontend/
├── src/
│   ├── app/
│   ├── domain/
│   ├── application/
│   ├── adapters/
│   ├── modules/
│   │   ├── public/
│   │   ├── natural-customer/
│   │   ├── business-customer/
│   │   ├── business-operator/
│   │   ├── business-supervisor/
│   │   ├── teller/
│   │   ├── commercial/
│   │   └── internal-analyst/
│   ├── components/
│   ├── styles/
│   └── main.tsx
├── public/
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── .env.example
├── Dockerfile
└── README.md
```

## 3. Mandatory input contracts

Read before editing:

- `frontendSDD/Frontend-SDD.md`
- `frontendSDD/Frontend-Architecture.md`
- `frontendSDD/Frontend-Domain-Services.md`
- `frontendSDD/Frontend-Adapters.md`
- `frontendSDD/Frontend-Role-Modules.md`
- `frontendSDD/Frontend-Design-System.md`
- `frontendSDD/Frontend-User-Flows.md`
- `backendSDD/Contract-alignment.md`
- `backendSDD/Adapters/Api-rest-endpoints.md`
- `backendSDD/Adapters/Rest-validation.md`
- `backendSDD/Adapters/Global-exception-handler.md`
- `backendSDD/Backend-Cors-Security.md`

The backend contracts are authoritative for URL, HTTP method, DTO fields, status, JWT claims, roles and error codes.

## 4. Resume and diagnostic protocol

Before implementation:

1. Confirm the frontend root is `frontend/` and the backend API base is `VITE_API_BASE_URL`, default `http://localhost:8080`.
2. Inspect existing React files, dependencies, routes, tests and environment files.
3. Produce a per-deliverable state table: `NOT_STARTED`, `PARTIAL`, `IMPLEMENTED`, `FAILING` or `VERIFIED`.
4. Run the existing build, lint and tests before editing.
5. Compare every endpoint mapping, role module, DTO mapper, error mapping and session rule with the SDD.
6. Select the first unblocked task by dependency order and persist evidence in frontend state.

Never replace verified components without evidence. Never declare an endpoint consumed because only a TypeScript function exists; exercise its HTTP behavior.

## 5. Dependencies and boundaries

Use React + TypeScript + Vite. Use a maintained HTTP client or a typed `fetch` adapter, React Router, a tested state/session approach, and SweetAlert2 through an alert adapter.

Required boundaries:

- Domain models and ports do not import React, browser globals, Axios/fetch or SweetAlert2.
- Application services orchestrate domain ports.
- HTTP adapter is the only layer that contacts `http://localhost:8080`.
- Session adapter is the only layer that reads/writes the JWT.
- Alert adapter is the only layer that calls SweetAlert2.
- Components and pages never construct URLs or Authorization headers directly.

## 6. Implementation phases

### F1. Application foundation

Create Vite React TypeScript configuration, environment handling, router, providers, error boundary, responsive layout, design tokens and accessible common components.

### F2. HTTP and JWT adapters

Implement:

- API base URL from `VITE_API_BASE_URL`;
- JSON headers;
- `Authorization: Bearer <token>` for every protected request;
- `X-Request-Id` propagation;
- timeout and cancellation;
- standard backend error envelope mapping;
- `401` session clearing and redirect;
- `403` forbidden alert;
- no password or secret persistence.

### F3. Service and mapper layer

Implement every service in `Frontend-Domain-Services.md` and every endpoint mapping in `Frontend-Adapters.md`. Create request and response mappers that validate the backend shape before exposing it to UI.

### F4. Public authentication

Implement login, logout, natural customer registration, business customer registration, customer user registration and employee registration where authorized by the backend flow. Show loading, success, validation and server error states.

### F5. Role modules

Implement a protected router and all modules:

- Natural customer: product dashboard, profile, accounts, balances, loans, payments, transfers and operations.
- Business customer: company dashboard, products, delegated users and transfer approval/rejection.
- Business operator: accounts and high-value transfers.
- Business supervisor: pending transfer queue and approval actions.
- Teller: customer search, account opening, consultation, deposits, withdrawals, block, unblock and close.
- Commercial employee: customer search and loan requests.
- Internal analyst: employee registration, customer status, loan approval/rejection/disbursement/closure and audit logs.

Every authenticated customer or company-related user must land on a summary dashboard appropriate to the role and customer relationship.

### F6. UX feedback

Implement stable loading skeletons, disabled states during mutation, retry actions, empty states, responsive layout and meaningful animations. Use SweetAlert2 for every expected error and confirmation of financial/destructive actions. Never hide a backend error silently.

### F6.1. Required experience flow

Implement the following observable behavior, not only the underlying requests:

1. Public entry opens on a branded-but-original banking login with username/password validation, loading state and clear recovery from `401`.
2. After login, show a short transition into the role dashboard; do not render a blank screen while summary requests are pending.
3. Dashboard cards show product name, status, balance or amount, last update and a direct action. Cards have skeletons, empty states and retry controls.
4. Financial forms validate locally before sending, disable submit while pending, confirm irreversible actions, show success feedback and refresh affected summaries.
5. Errors use the backend stable `code`, a human-safe message and `requestId` support detail where useful; never expose stack traces or raw database text.
6. A `401` clears the session and returns to login with an expiration message. A `403` keeps the session and shows a forbidden alert. A `409` explains the business conflict and preserves entered form data.
7. Every role has a persistent navigation shell, visible active route, breadcrumb or page title, responsive mobile navigation and logout action.
8. Long-running consultations use skeletons or progress indicators; mutations use a focused button state so users know which action is pending.
9. Destructive and financial actions require SweetAlert confirmation with explicit amount, account, destination or loan identity before execution.
10. Empty collections explain the next useful action rather than showing an unexplained blank panel.

### F6.2. Component and accessibility requirements

- Build reusable `Button`, `Input`, `Select`, `Modal`, `Alert`, `Skeleton`, `DataTable`, `StatusBadge`, `MoneyAmount`, `AccountCard`, `LoanCard` and `TransferCard` components.
- Every input has a label, validation message and keyboard-accessible focus state.
- Every async action exposes a visible busy state and disables duplicate submission.
- Color is never the sole indicator of status; pair it with text or an icon.
- Tables and cards remain usable at mobile widths without horizontal overflow where avoidable.

### F7. Testing

Create tests for:

- HTTP adapter JWT header propagation and `401` handling;
- request/response mappers;
- session persistence and expiry;
- role guards for every role;
- dashboard loading/success/empty/error states;
- every module's main flow;
- SweetAlert invocation for each error category;
- endpoint smoke flows against the real backend when available.
- desktop and mobile screenshots for login, loading, dashboard, empty, error, confirmation and success states;
- keyboard, focus, contrast and reduced-motion accessibility checks;
- role-by-role user journey tests from login to logout.

### F8. Docker and delivery

Create `frontend/Dockerfile` and integrate it into root Compose when requested by the backend Docker contract. Configure frontend-to-backend networking correctly: browser development uses `http://localhost:8080`; container-to-container server-side calls use the Compose service name where applicable.

## 7. Frontend acceptance gate

Do not report `COMPLETE` until:

- all frontend code is under `frontend/`;
- every documented backend endpoint has a frontend mapping or explicit exclusion decision;
- JWT is sent on every protected request;
- every role has a protected module and dashboard behavior;
- loading animations, error alerts and retry states work;
- the design system and user flows in `Frontend-Design-System.md` and `Frontend-User-Flows.md` are implemented;
- the interface uses original identity and assets, with no third-party corporate names, logos or proprietary visual material;
- responsive screenshots and accessibility checks pass at the documented viewports;
- CORS contract is verified against `backendSDD/Backend-Cors-Security.md`;
- required experience flows, loading states, error states and financial confirmations are tested per role;
- all endpoint mappings have a verified HTTP test or an explicit backend-blocked record;
- build, lint, unit tests and smoke/E2E tests pass;
- no endpoint, role, DTO or error mapping remains unverified.

Required report:

```text
Status: COMPLETE | IN_PROGRESS | BLOCKED
Frontend stack: React + TypeScript + Vite
Task selected: ...
Files changed: ...
Commands and exit codes: ...
Build/lint/unit/E2E results: ...
Endpoint coverage: .../... 
Role modules: .../...
JWT/CORS results: ...
Remaining blockers: ...
Next action: ...
```
