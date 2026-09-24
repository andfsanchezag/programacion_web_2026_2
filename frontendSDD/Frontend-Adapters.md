# Frontend Adapters SDD

## 1. HTTP adapter

The HTTP adapter is the only frontend component allowed to call `http://localhost:8080`.

Configuration:

```text
VITE_API_BASE_URL=http://localhost:8080
```

Request rules:

- Public requests omit `Authorization`.
- Protected requests send `Authorization: Bearer <accessToken>`.
- JSON requests send `Content-Type: application/json` and `Accept: application/json`.
- The adapter forwards `X-Request-Id` and generates one when needed.
- Query parameters are encoded through a structured URL API.
- Request bodies are validated/mapped before transport.

Response rules:

- Decode JSON only when a body exists.
- Preserve status, headers and body for service-level mapping.
- Map the backend error envelope to `ApiError`.
- On `401`, clear session and route to login.
- On `403`, retain the session and show a permission alert.
- On `404`, `409`, `422` or `503`, show the stable backend error code and a safe message.
- On `500`, show a generic failure message and keep diagnostic request id available.

## 2. JWT session adapter

The session adapter provides:

- `saveSession(session)`
- `readSession()`
- `getAccessToken()`
- `clearSession()`
- `isExpired()`

The adapter must not trust role data from arbitrary UI state. It uses the authenticated response and validates expiration locally for UX; the backend remains authoritative.

Storage policy:

- Prefer an in-memory session with a documented refresh strategy if the backend provides one.
- If persistence across reloads is required and no refresh endpoint exists, store the access token in `sessionStorage`, not long-lived local storage, and document the XSS trade-off.
- Never store passwords or backend secrets.

## 3. Alert adapter

The alert adapter isolates SweetAlert2:

- `showValidationError(error)`
- `showAuthenticationError(error)`
- `showAuthorizationError(error)`
- `showConflict(error)`
- `showDependencyError(error)`
- `showUnexpectedError(error)`
- `confirmFinancialAction(config)`
- `showSuccess(message)`

Financial actions such as transfers, withdrawals, loan approval, rejection and closure require confirmation before the HTTP call.

## 4. Endpoint mapping

| Frontend service | Method | Backend endpoint | Auth |
|---|---|---|---|
| AuthenticationService.login | POST | `/api/v1/auth/login` | Public |
| AuthenticationService.logout | POST | `/api/v1/auth/logout` | JWT |
| AuthenticationService.registerNaturalCustomer | POST | `/api/v1/auth/register/natural-customer` | Public |
| AuthenticationService.registerBusinessCustomer | POST | `/api/v1/auth/register/business-customer` | Public |
| AuthenticationService.registerCustomerUser | POST | `/api/v1/auth/register/user` | Public |
| CustomerService.getMyProfile | GET | `/api/v1/natural-customer/profile` | NATURAL_CUSTOMER |
| CustomerService.updateMyProfile | PUT | `/api/v1/natural-customer/profile` | NATURAL_CUSTOMER |
| AccountService.getMyAccounts | GET | `/api/v1/natural-customer/accounts` | NATURAL_CUSTOMER |
| AccountService.getBalance | GET | `/api/v1/natural-customer/accounts/{accountNumber}/balance` | NATURAL_CUSTOMER |
| LoanService.requestLoan | POST | `/api/v1/natural-customer/loans` | NATURAL_CUSTOMER |
| LoanService.getLoan | GET | `/api/v1/natural-customer/loans/{loanId}` | NATURAL_CUSTOMER |
| LoanService.registerPayment | POST | `/api/v1/natural-customer/loans/{loanId}/payments` | NATURAL_CUSTOMER |
| TransferService.createNaturalTransfer | POST | `/api/v1/natural-customer/transfers` | NATURAL_CUSTOMER |
| AuditService.getMyOperations | GET | `/api/v1/natural-customer/operations` | NATURAL_CUSTOMER |
| CustomerService.getCompanyProfile | GET | `/api/v1/business-customer/profile` | BUSINESS_CUSTOMER |
| AuthenticationService.registerCustomerUser | POST | `/api/v1/business-customer/users` | BUSINESS_CUSTOMER |
| TransferService.approveTransfer | PATCH | `/api/v1/business-customer/transfers/{transferId}/approve` | BUSINESS_CUSTOMER |
| TransferService.rejectTransfer | PATCH | `/api/v1/business-customer/transfers/{transferId}/reject` | BUSINESS_CUSTOMER |
| AccountService.getCompanyAccounts | GET | `/api/v1/business-operator/accounts` | BUSINESS_OPERATOR |
| TransferService.createBusinessTransfer | POST | `/api/v1/business-operator/transfers` | BUSINESS_OPERATOR |
| TransferService.getPendingTransfers | GET | `/api/v1/business-supervisor/transfers/pending` | BUSINESS_SUPERVISOR |
| TransferService.approveTransfer | PATCH | `/api/v1/business-supervisor/transfers/{transferId}/approve` | BUSINESS_SUPERVISOR |
| TransferService.rejectTransfer | PATCH | `/api/v1/business-supervisor/transfers/{transferId}/reject` | BUSINESS_SUPERVISOR |
| AccountService.deposit | POST | `/api/v1/teller/accounts/{accountNumber}/deposits` | TELLER_EMPLOYEE |
| AccountService.withdraw | POST | `/api/v1/teller/accounts/{accountNumber}/withdrawals` | TELLER_EMPLOYEE |
| AccountService.blockAccount | PATCH | `/api/v1/teller/accounts/{accountNumber}/block` | TELLER_EMPLOYEE |
| AccountService.unblockAccount | PATCH | `/api/v1/teller/accounts/{accountNumber}/unblock` | TELLER_EMPLOYEE |
| AccountService.closeAccount | PATCH | `/api/v1/teller/accounts/{accountNumber}/close` | TELLER_EMPLOYEE |
| LoanService.requestLoanForCustomer | POST | `/api/v1/commercial/loans` | COMMERCIAL_EMPLOYEE |
| AuthenticationService.registerEmployeeUser | POST | `/api/v1/internal-analyst/users/employee` | INTERNAL_ANALYST |
| CustomerService.changeCustomerStatus | PATCH | `/api/v1/internal-analyst/customers/{identification}/status` | INTERNAL_ANALYST |
| LoanService.approveLoan | PATCH | `/api/v1/internal-analyst/loans/{loanId}/approve` | INTERNAL_ANALYST |
| LoanService.rejectLoan | PATCH | `/api/v1/internal-analyst/loans/{loanId}/reject` | INTERNAL_ANALYST |
| LoanService.disburseLoan | POST | `/api/v1/internal-analyst/loans/{loanId}/disburse` | INTERNAL_ANALYST |
| LoanService.closeLoan | DELETE | `/api/v1/internal-analyst/loans/{loanId}` | INTERNAL_ANALYST |
| AuditService.getAuditLogs | GET | `/api/v1/internal-analyst/audit-logs` | INTERNAL_ANALYST |

The implementation must reconcile this table with the complete backend endpoint document before coding; undocumented backend extras require a contract decision.
