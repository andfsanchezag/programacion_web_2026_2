# Frontend Role Modules SDD

## 1. Shared public module

Routes:

- `/login`
- `/register/natural-customer`
- `/register/business-customer`
- `/register/user`

Components:

- `LoginForm`
- registration forms per contract;
- `AuthErrorAlert`;
- loading submit state;
- protected-route redirect.

## 2. Natural customer module

Route prefix: `/customer`.

Screens and components:

- Dashboard with customer profile, accounts, balances, active loans, recent operations and recent transfers.
- Profile view and edit form.
- Accounts list and account balance detail.
- Loan request, detail and payment forms.
- Transfer creation with source/destination validation, amount confirmation and status tracking.
- Operations history.

## 3. Business customer module

Route prefix: `/business`.

- Company dashboard with profile, products, accounts, pending approvals and recent operations.
- Delegated-user registration.
- Company transfer approval and rejection with confirmation and reason.

## 4. Business operator module

Route prefix: `/business/operator`.

- Company accounts.
- Payroll/high-value transfer creation.
- Waiting-for-approval status and operation history.

## 5. Business supervisor module

Route prefix: `/business/supervisor`.

- Pending transfer queue.
- Transfer detail.
- Approve/reject actions with confirmation and alerts.

## 6. Teller module

Route prefix: `/teller`.

- Customer search.
- Account opening and consultation.
- Deposit, withdrawal, block, unblock and close actions.
- Confirmation dialogs for money movement and closure.

## 7. Commercial employee module

Route prefix: `/commercial`.

- Customer search.
- Loan request on behalf of a customer.
- Customer products and loan status.

## 8. Internal analyst module

Route prefix: `/analyst`.

- Employee registration.
- Customer operational status management.
- Loan approval, rejection, disbursement and closure.
- Paginated audit log search with filters.

## 9. Role guard rules

- The router must expose only the module allowed by the backend `SystemRole`.
- Direct navigation to another role's route shows a forbidden alert and returns to the user's dashboard.
- UI role guards improve UX only; backend authorization remains mandatory.
- A user associated with a business customer must receive the dashboard appropriate to the user's role and company relationship.
