# Frontend User Flows SDD

## 1. Shared authentication flow

```text
Landing/login
  -> validate fields locally
  -> submit with loading state
  -> 200: store safe session and route by role
  -> 401: SweetAlert invalid credentials, preserve username
  -> 503: dependency alert with retry
```

Registration follows the same pattern and routes to a success state without automatically assuming the user is authenticated unless the backend response explicitly provides a token.

## 2. Natural customer flow

```text
Login -> customer dashboard
  -> summary cards for accounts, balances, loans and recent activity
  -> select account -> balance and operations
  -> request loan -> validate -> review -> confirm -> result
  -> create transfer -> source/destination/amount review -> confirm -> result
```

Recoverable errors preserve form values. Insufficient balance and invalid lifecycle states are shown as business conflict alerts.

## 3. Business customer flow

```text
Login -> company dashboard
  -> company profile/accounts/products summary
  -> delegated user form -> validate role and fields -> confirm -> result
  -> transfer approval queue -> review -> approve/reject confirmation -> result
```

The interface must make the company context visible without exposing another company's data.

## 4. Business operator and supervisor flow

```text
Operator login -> company accounts -> high-value transfer form
  -> review amount/destination -> confirm -> WAITING_FOR_APPROVAL state

Supervisor login -> pending queue -> transfer detail -> approve/reject
  -> success status refresh or conflict alert
```

A pending operation must remain visually distinct from an executed operation.

## 5. Teller flow

```text
Teller login -> customer search -> customer accounts
  -> open/consult account
  -> deposit or withdrawal -> review amount/reference -> confirm -> updated balance
  -> block/unblock/close -> confirmation -> refreshed status
```

Money movement always displays account identity, amount and resulting status before confirmation.

## 6. Commercial employee flow

```text
Commercial login -> customer search -> customer products
  -> loan request on behalf -> validate customer/account -> review -> submit -> result
```

The selected customer must remain visible throughout the loan workflow.

## 7. Internal analyst flow

```text
Analyst login -> risk dashboard
  -> customer status management
  -> employee user registration
  -> loan review -> approve/reject/disburse/close
  -> audit log filters -> paginated results -> detail
```

Destructive or irreversible actions require explicit confirmation and display the target resource.

## 8. Global recovery flows

- Expired/invalid JWT: clear session, show expiration alert, route to login.
- Wrong role: show forbidden alert and return to the role dashboard.
- Not found: show resource-specific alert and preserve navigation context.
- Conflict: show backend stable code and preserve user inputs.
- Dependency unavailable: show retry action and request id.
- Unknown error: show generic safe message and request id, never raw stack details.
- Network offline: show offline state and retry without losing entered form data.
