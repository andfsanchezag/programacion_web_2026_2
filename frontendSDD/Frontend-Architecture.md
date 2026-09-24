# Frontend Architecture SDD

## 1. Architecture style

The frontend follows a feature-oriented hexagonal client architecture:

```text
React Pages / Components
        |
        v
Role Modules and View Models
        |
        v
Frontend Domain Services
        |
        v
Input Adapters / API Client
        |
        v
HTTP Adapter + JWT Session Adapter
        |
        v
Banking Backend http://localhost:8080
```

UI components must not know HTTP details, token storage details or backend error classification.

## 2. Proposed structure

```text
frontend/
├── src/
│   ├── app/
│   │   ├── AppRouter.tsx
│   │   ├── AuthenticatedLayout.tsx
│   │   ├── providers/
│   │   └── guards/
│   ├── domain/
│   │   ├── models/
│   │   ├── enums/
│   │   ├── errors/
│   │   └── ports/
│   ├── application/
│   │   ├── services/
│   │   ├── session/
│   │   └── viewModels/
│   ├── adapters/
│   │   ├── http/
│   │   ├── auth/
│   │   ├── alerts/
│   │   └── mappers/
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
└── .env.example
```

## 3. Dependency rules

- `domain` depends on no React, browser, HTTP or SweetAlert implementation.
- `application` depends on domain ports and orchestrates frontend use cases.
- `adapters` implements HTTP, storage and alert ports.
- `modules` depend on application services and reusable components.
- `components` receive data and callbacks; they do not construct backend URLs.
- Routing and role guards depend on session state, never on duplicated token parsing in each page.

## 4. Session flow

1. Login service calls `POST /api/v1/auth/login`.
2. Response mapper validates `token`, `tokenType`, `expiresIn` and user role.
3. Session adapter stores the access token and safe user claims.
4. HTTP adapter adds `Authorization: Bearer <token>` to protected requests.
5. Router selects the role module.
6. Dashboard service loads the summary appropriate to the authenticated customer or business user.
7. A `401` clears the session and redirects to login; `403` shows an authorization alert without silently changing the role.

## 5. UI direction

- Primary palette: warm yellow accent, deep charcoal, white, cool neutrals and semantic green/red states.
- Use original layout, typography and icons; do not reproduce Bancolombia logos or proprietary visual assets.
- Use subtle page-entry and loading animations, skeletons and progress feedback.
- Use SweetAlert2 for errors, confirmations and completed destructive or financial operations.
- Keep financial amounts, statuses and next actions visually prominent.
