# Frontend SDD - Banking Web Application

## 1. Purpose

This document defines the functional and technical design for the React frontend that consumes the banking backend exposed at `http://localhost:8080`.

This is a design contract, not an implementation file. The frontend must be generated only after the contracts in this folder are reviewed and the backend endpoint matrix is verified.

## 2. Scope

The frontend must provide:

- Public authentication and registration flows.
- JWT persistence and authorization header propagation on every protected request.
- Role-specific modules for all backend roles.
- Product summary as the initial authenticated view for natural customers and users associated with business customers.
- Loading states and animations for remote operations.
- SweetAlert2 alerts for expected request failures and actionable feedback.
- Responsive banking UI using a yellow, black, white and neutral palette inspired by Bancolombia without copying proprietary branding or assets.
- Complete consumption of the documented backend endpoints.

## 3. Source Contracts

The implementation must use these documents as source contracts:

- `backendSDD/Contract-alignment.md`
- `backendSDD/Adapters/Api-rest-endpoints.md`
- `backendSDD/Adapters/Rest-validation.md`
- `backendSDD/Adapters/Global-exception-handler.md`
- `backendSDD/Domain/Input-ports.md`
- `backendSDD/Domain/Output-ports.md`
- `frontendSDD/Frontend-Architecture.md`
- `frontendSDD/Frontend-Domain-Services.md`
- `frontendSDD/Frontend-Adapters.md`
- `frontendSDD/Frontend-Role-Modules.md`
- `frontendSDD/Frontend-Design-System.md`
- `frontendSDD/Frontend-User-Flows.md`
- `backendSDD/Backend-Cors-Security.md`

If an endpoint or response differs between the backend and this SDD, the discrepancy must be recorded and resolved before frontend implementation.

## 4. Non-functional requirements

- TypeScript strict mode.
- React with component composition and accessible semantic HTML.
- API base URL configured through environment variables; default development value `http://localhost:8080`.
- No backend persistence logic in React components.
- No direct `fetch` or Axios calls from page components; all calls go through frontend adapters/services.
- No JWT secrets in browser storage. Store only the issued access token and safe user session data.
- Clear logout behavior on token expiration or `401` responses.
- All backend errors must be converted to the standard error shape and displayed through SweetAlert2 or an equivalent centralized alert adapter.
- Each role must have a complete user journey from login to dashboard, consultation, mutation, success feedback, failure recovery and logout.
- The implementation must preserve entered form values after recoverable `400`, `409` and `503` errors.

## 5. Acceptance criteria

The frontend design is complete when every endpoint in the backend matrix has a frontend service mapping, every role has a module mapping, JWT propagation is defined, CORS is accepted by the backend contract, and the architecture can be implemented without inventing endpoint behavior.

## 6. Experience acceptance matrix

| Experience | Required states | Required verification |
|---|---|---|
| Login | idle, validating, loading, success, invalid credentials, dependency error | route transition and session creation |
| Dashboard | skeleton, loaded cards, empty products, retry | role-specific summary visible |
| Form mutation | local validation, pending, confirmation, success, conflict, retry | duplicate submit prevented |
| Protected navigation | allowed, expired session, wrong role | `401` redirect and `403` alert |
| Collections | loading, populated, empty, failed | retry preserves route/filter |
| Financial action | review, confirm, processing, success, failure | amount and destination shown before send |

The frontend agent must implement and test every row for each applicable role.
