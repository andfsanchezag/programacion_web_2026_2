# REST Validation Specification

## 1. Purpose

This document defines, independently of the implementation language, how the
REST delivery layer validates every incoming request before any domain logic
executes. It applies equally to TypeScript, Java or any other stack implementing
`backendSDD/Adapters/Api-rest-endpoints.md`. Cross-stack naming, signatures and status
precedence are defined in `backendSDD/Contract-alignment.md`.

Validation happens in this order:

```text
1. Transport  (well-formed JSON, Content-Type, path/query parsing)
2. Shape      (required fields present, types correct, no type coercion surprises)
3. Format     (emails, dates, enums, identifiers, numeric ranges)
4. Semantics  (cross-field rules: amounts, ownership references, state transitions)
5. Security   (authentication and role authorization)
```

A failure at any stage stops processing and returns the uniform error shape
defined in `backendSDD/Adapters/Global-exception-handler.md`. Domain business rules
(balance, eligibility, approval authority) are NOT part of this document; they
belong to `backendSDD/Domain/services/`.

Unless `Api-rest-endpoints.md` explicitly declares otherwise, validation failures
return `400 INVALID_REQUEST` or a deterministic `INVALID_<FIELD>` code. This
project does not use `422` for the currently documented endpoints.

## 2. Global Conventions

### 2.1. Types and coercion

| Rule | Detail |
|---|---|
| `string` | Must be a JSON string. Numbers, booleans or null are rejected. |
| `number` | Must be a JSON number, finite, never `NaN`. Numeric strings are rejected. |
| `boolean` | Must be a JSON boolean. |
| `date` | ISO-8601 string (`YYYY-MM-DD` or full timestamp). Must represent a real calendar date. |
| `enum` | Exact documented code (case-sensitive). Unknown codes are rejected. |
| `map/details` | Plain JSON object when required; never an array. |

### 2.2. Presence

| Marker | Meaning |
|---|---|
| Required | Missing, `null` or (for strings) blank/whitespace-only is rejected. |
| Optional | May be omitted. If present, `null` is rejected unless the contract says otherwise; format rules still apply. |

### 2.3. String formats

| Field kind | Rule | Example |
|---|---|---|
| `identification` | 1–30 chars, no surrounding whitespace | `1017123456` |
| `username` | 3–40 chars, no whitespace | `operativo_tech` |
| `password` | Min 8 chars, max 100 | — |
| `email` | Single `@`, non-empty local and domain parts | `user@example.com` |
| `phoneNumber` | 7–15 digits (leading `+` allowed) | `3001234567` |
| `name` | 1–120 chars, non-blank | — |
| `address` | 1–200 chars when required | — |
| `accountNumber` | 1–30 chars, no whitespace | `CTA-100200300` |
| `loanId` / `transferId` | 1–40 chars, no whitespace | `LOAN-5501` |
| `role` | Valid `SystemRole` code | `TELLER_EMPLOYEE` |
| `status` (customer) | `ACTIVE`, `INACTIVE` or `BLOCKED` | — |
| `loanType` | Valid `LoanType` code | `PERSONAL` |
| `accountType` | Valid `AccountType` code | `SAVINGS` |
| `currency` | 3-letter ISO code | `COP` |

### 2.4. Numbers

| Field kind | Rule |
|---|---|
| `amount`, `requestedAmount`, `approvedAmount`, `interestRate` inputs | `> 0`. Zero and negatives are rejected. |
| `termInMonths` | Positive integer (`>= 1`). |
| `interestRate` (approve) | `> 0`. |
| `page` | Integer `>= 0` (defaults to `0` when absent or unparseable). |
| `size` | Integer `>= 1` (defaults to `20`; an upper bound such as `100` may be enforced). |

### 2.5. Transport errors

| Situation | Status | Code |
|---|---|---|
| Malformed JSON body | 400 | `INVALID_REQUEST` |
| Missing `Content-Type: application/json` on `POST`/`PUT`/`PATCH` with body | 400 | `INVALID_REQUEST` |
| Unregistered path | 404 | `RESOURCE_NOT_FOUND` |

## 3. Public Access (`/api/v1/auth`)

### 3.1. `POST /api/v1/auth/login`

| Field | Req | Rule | Error |
|---|---|---|---|
| `username` | Yes | username format | 400 `INVALID_REQUEST` |
| `password` | Yes | non-blank string | 400 `INVALID_REQUEST` |

Wrong credentials → 401 `INVALID_CREDENTIALS`. Inactive user → 403 `FORBIDDEN`.

### 3.2. `POST /api/v1/auth/logout`

No body. Requires valid token; missing/invalid → 401. Success → 204 (empty body).

### 3.3. `POST /api/v1/auth/register/natural-customer`

| Field | Req | Rule |
|---|---|---|
| `identification` | Yes | identification format, unique |
| `name` | Yes | name format |
| `email` | Yes | email format, unique |
| `phoneNumber` | Yes | phone format |
| `address` | Yes | address format |
| `birthDate` | Yes | date, must be in the past |

Duplicate identification/email → 409. Success → 201.

### 3.4. `POST /api/v1/auth/register/business-customer`

Same base fields as §3.3 plus:

| Field | Req | Rule |
|---|---|---|
| `legalRepresentativeIdentification` | Yes | must reference an existing natural customer |

Unknown representative → 404. Success → 201.

### 3.5. `POST /api/v1/auth/register/user`

| Field | Req | Rule |
|---|---|---|
| `customerIdentification` | Yes | must reference an existing customer |
| `username` | Yes | username format, unique |
| `password` | Yes | password format |
| `role` | Yes | valid `SystemRole` code |

Unknown customer → 404. Duplicate username → 409. Success → 201.

## 4. Natural Customer (`/api/v1/natural-customer`)

All endpoints require a `NATURAL_CUSTOMER` token (otherwise 401/403).

### 4.1. `GET /profile` — no body, 200.

### 4.2. `PUT /profile`

| Field | Req | Rule |
|---|---|---|
| `email` | No | email format |
| `phoneNumber` | No | phone format |
| `address` | No | address format |

At least one field should be present. Success → 200.

### 4.3. `GET /accounts` — no body, 200 (possibly empty list).

### 4.4. `GET /accounts/{accountNumber}/balance`

`accountNumber` path param: accountNumber format. Unknown account → 404. Success → 200.

### 4.5. `POST /loans`

| Field | Req | Rule |
|---|---|---|
| `loanType` | Yes | valid `LoanType` code |
| `requestedAmount` | Yes | `> 0` |
| `termInMonths` | Yes | positive integer |
| `destinationAccountNumber` | Yes | accountNumber format, must exist and belong to the applicant |

Success → 201 (`UNDER_REVIEW`).

### 4.6. `GET /loans/{loanId}` — unknown id → 404, else 200.

### 4.7. `POST /loans/{loanId}/payments`

| Field | Req | Rule |
|---|---|---|
| `sourceAccountNumber` | Yes | accountNumber format, must exist |
| `amount` | Yes | `> 0` |

Unknown loan → 404. Success → 200.

### 4.8. `POST /transfers` (Create & Execute)

| Field | Req | Rule |
|---|---|---|
| `sourceAccountNumber` | Yes | accountNumber format, must exist and belong to the requester |
| `destinationAccountNumber` | Yes | accountNumber format, must exist, must differ from source |
| `amount` | Yes | `> 0` and `<=` source available balance |
| `description` | No | max 280 chars |

Response: 201 `EXECUTED` when no approval is required, 201 with
`WAITING_FOR_APPROVAL` when the amount reaches the approval threshold.
Unknown account → 404. Insufficient balance → 409.

### 4.9. `GET /operations`

| Query | Req | Rule |
|---|---|---|
| `accountNumber` | No | accountNumber format when present |

Success → 200 (possibly empty list).

## 5. Business Customer (`/api/v1/business-customer`)

Token role must be `BUSINESS_CUSTOMER`.

### 5.1. `GET /profile` — 200.

### 5.2. `POST /users`

| Field | Req | Rule |
|---|---|---|
| `username` | Yes | username format, unique |
| `password` | Yes | password format |
| `role` | Yes | `BUSINESS_OPERATOR` or another delegated company role |
| `email` | Yes | email format |
| `identification` | Yes | identification format |
| `name` | Yes | name format |

The new user is always attached to the requester's company. Success → 201.

### 5.3. `PATCH /transfers/{transferId}/approve` — no body.

Transfer must exist (else 404) and be `WAITING_FOR_APPROVAL` (else 409). Success → 200.

### 5.4. `PATCH /transfers/{transferId}/reject`

| Field | Req | Rule |
|---|---|---|
| `rejectionReason` | Yes | 1–500 chars, non-blank |

Same state preconditions as §5.3. Success → 200.

## 6. Business Operator (`/api/v1/business-operator`)

Token role must be `BUSINESS_OPERATOR`.

### 6.1. `POST /transfers`

Same field rules as §4.8. High-value transfers stay `WAITING_FOR_APPROVAL`.
Success → 202.

### 6.2. `GET /accounts` — 200 (possibly empty list).

## 7. Business Supervisor (`/api/v1/business-supervisor`)

Token role must be `BUSINESS_SUPERVISOR`.

### 7.1. `GET /transfers/pending` — 200 (possibly empty list).

### 7.2. `PATCH /transfers/{transferId}/approve` — no body.

Same preconditions as §5.3. Success → 200.

## 8. Teller Employee (`/api/v1/teller`)

Token role must be `TELLER_EMPLOYEE`.

### 8.1. `POST /accounts/{accountNumber}/deposits`

| Field | Req | Rule |
|---|---|---|
| `amount` | Yes | `> 0` |
| `reference` | No | max 280 chars |

Account must exist and be operational (else 404/409). Success → 200 with updated balance.

### 8.2. `POST /accounts/{accountNumber}/withdrawals`

| Field | Req | Rule |
|---|---|---|
| `amount` | Yes | `> 0` and `<=` available balance |
| `clientIdentification` | No | identification format when present |

Insufficient balance → 409. Success → 200 with updated balance.

### 8.3. `PATCH /accounts/{accountNumber}/block` — no body.

Account must be active (already blocked/closed → 409). Success → 200.

## 9. Commercial Employee (`/api/v1/commercial`)

Token role must be `COMMERCIAL_EMPLOYEE`.

### 9.1. `POST /loans`

| Field | Req | Rule |
|---|---|---|
| `customerIdentification` | Yes | must reference an existing, eligible customer |
| `loanType` | Yes | valid `LoanType` code |
| `requestedAmount` | Yes | `> 0` |
| `termInMonths` | Yes | positive integer |
| `destinationAccountNumber` | Yes | must exist and belong to the customer |

Unknown customer/account → 404. Success → 201.

## 10. Internal Analyst (`/api/v1/internal-analyst`)

Token role must be `INTERNAL_ANALYST`.

### 10.1. `POST /users/employee`

Same field rules as §5.2. Success → 201.

### 10.2. `PATCH /customers/{identification}/status`

| Field | Req | Rule |
|---|---|---|
| `status` | Yes | `ACTIVE`, `INACTIVE` or `BLOCKED` |
| `reason` | No | max 500 chars |

Unknown customer → 404. Unsupported value → 400. Success → 200.

### 10.3. `PATCH /loans/{loanId}/approve`

| Field | Req | Rule |
|---|---|---|
| `approvedAmount` | Yes | `> 0` and `<= requestedAmount` |
| `interestRate` | Yes | `> 0` |

Loan must be `UNDER_REVIEW` (else 409). Success → 200.

### 10.4. `POST /loans/{loanId}/disburse` — no body.

Loan must be `APPROVED` with positive approved amount and operational destination
account (else 409). Success → 200.

### 10.5. `GET /audit-logs`

| Query | Req | Rule |
|---|---|---|
| `userId` | No | opaque identifier; blank values are ignored, other values filter by exact match |
| `operationType` | No | must be a valid `OperationType` code when present (else 400) |
| `accountNumber` | No | opaque identifier; blank values are ignored, other values filter by exact match |
| `page` | No | integer `>= 0`, defaults `0` |
| `size` | No | integer `>= 1`, defaults `20` |

Success → 200 with `{content, totalElements, totalPages}`.

### 10.6. `DELETE /loans/{loanId}` — no body.

Loan must exist (else 404) and be in a closable state (else 409). Success → 204
with empty body.

## 11. Validation Error Reference

Error codes are stable and machine-readable. Unless a fixed code is listed,
the code derives deterministically from the failing rule or exception name in
`SCREAMING_SNAKE_CASE` (e.g. `CUSTOMER_NOT_FOUND`, `INSUFFICIENT_BALANCE`,
`INVALID_TRANSFER_STATUS_TRANSITION`). Clients must match on `code`, never on
`message`.

| Status | Code | Meaning |
|---|---|---|
| 400 | `INVALID_REQUEST` | Malformed JSON, missing/unparseable envelope, unknown route payload |
| 400 | `INVALID_<FIELD>` | Field-level rule from this document (e.g. `INVALID_TRANSFER`, `INVALID_CUSTOMER_STATUS`) |
| 401 | `AUTHENTICATION_REQUIRED` | Missing token |
| 401 | `INVALID_CREDENTIALS` | Wrong credentials or invalid/expired token |
| 403 | `FORBIDDEN` | Authenticated but wrong role, or inactive user |
| 404 | `<ENTITY>_NOT_FOUND`, `RESOURCE_NOT_FOUND` | Referenced customer/user/account/loan/transfer/route does not exist |
| 409 | `RESOURCE_ALREADY_EXISTS`, `<ENTITY>_ALREADY_EXISTS` | Duplicate identification/email/username |
| 409 | `INVALID_STATE_TRANSITION`, `INSUFFICIENT_BALANCE` | Valid request but illegal current state |
| 500 | `INTERNAL_ERROR` | Unexpected failure, generic message only |
| 503 | `DEPENDENCY_UNAVAILABLE` | Database or external dependency failure |

Field validation failures never expose stack traces, SQL, or secrets. See
`backendSDD/Adapters/Global-exception-handler.md` for the uniform response shape.
