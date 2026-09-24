# Frontend Domain and Services SDD

## 1. Frontend domain models

The frontend uses transport-safe models mapped from backend DTOs:

- `Session`: token, token type, expiration, authenticated user.
- `FrontendUser`: user id, username, email, role, status and optional customer reference.
- `CustomerSummary`: identification, name, email, status and customer type.
- `BankAccountSummary`: account number, type, currency, balance and status.
- `LoanSummary`: loan id, type, amount, status, term and destination account.
- `TransferSummary`: transfer id, source, destination, amount, status and dates.
- `OperationSummary`: operation type, date and affected product.
- `AuditLogSummary`: audit id, operation type, date, performer and affected product.
- `PagedResult<T>`: content, total elements and total pages.
- `ApiError`: timestamp, HTTP status, stable code, safe message, path, request id and details.

Frontend models must not expose persistence entities or depend on TypeORM, Mongoose, Spring or Express types.

## 2. Frontend application services

### AuthenticationService

- `login(username, password)`
- `logout()`
- `registerNaturalCustomer(data)`
- `registerBusinessCustomer(data)`
- `registerCustomerUser(data)`
- `registerEmployeeUser(data)`
- `getCurrentSession()`

### CustomerService

- `getMyProfile()`
- `updateMyProfile(data)`
- `getCompanyProfile()`
- `getCustomer(identification)`
- `changeCustomerStatus(identification, data)`

### AccountService

- `getMyAccounts()`
- `getCompanyAccounts()`
- `getAccount(accountNumber)`
- `getBalance(accountNumber)`
- `openAccount(data)`
- `deposit(accountNumber, data)`
- `withdraw(accountNumber, data)`
- `blockAccount(accountNumber)`
- `unblockAccount(accountNumber)`
- `closeAccount(accountNumber)`

### LoanService

- `requestLoan(data)`
- `requestLoanForCustomer(data)`
- `getLoan(loanId)`
- `registerPayment(loanId, data)`
- `approveLoan(loanId, data)`
- `rejectLoan(loanId)`
- `disburseLoan(loanId)`
- `closeLoan(loanId)`

### TransferService

- `createNaturalTransfer(data)`
- `createBusinessTransfer(data)`
- `approveTransfer(transferId, roleContext)`
- `rejectTransfer(transferId, data, roleContext)`
- `getPendingTransfers()`

### AuditService

- `getMyOperations(filters)`
- `getAuditLogs(filters)`
- `getAllOperations(filters)`

## 3. Dashboard service

On login:

- Natural customer: profile, accounts, available balances, active loans, recent operations and recent transfers.
- Business customer: company profile, company accounts, pending approvals and recent operations.
- Business operator: company accounts, transfer actions and transfer status.
- Business supervisor: pending transfers and approval queue.
- Teller: customer/account search and teller operations.
- Commercial employee: customer search and loan workflow.
- Internal analyst: customer status, employee users, loan approvals and audit logs.

Dashboard calls must be resilient: a failure in a secondary widget must not hide the session shell. Show a localized alert and allow retry.

## 4. Loading and error states

Every service-backed view defines `idle`, `loading`, `success`, `empty` and `error` states. Loading uses a stable skeleton or progress animation; errors go through the centralized alert port; retry reuses the same service call.
