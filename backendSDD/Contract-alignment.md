# SDD Contract Alignment Policy

## 1. Purpose and authority

This document is the cross-stack alignment policy for the Banking Information Management System. It prevents contradictions between the domain, adapter, REST, validation, exception, architecture and orchestration documents.

The business contract is language-independent. Java and TypeScript are implementation profiles of the same contract.

When documents disagree, apply this precedence:

1. `backendbackendSDD/Contract-alignment.md` for cross-cutting naming, adaptation and status rules.
2. `backendbackendSDD/Domain/Domain Model.md`, `backendbackendSDD/Domain/Domain Services.md` and the detailed service SDDs for business behavior.
3. `backendbackendSDD/Domain/Input-ports.md` and `backendbackendSDD/Domain/Output-ports.md` for port responsibilities and semantic operations.
4. `backendbackendSDD/Adapters/Api-rest-endpoints.md` for endpoint methods, paths, DTOs and success statuses.
5. `backendbackendSDD/Adapters/Rest-validation.md` for request validation.
6. `backendbackendSDD/Adapters/Global-exception-handler.md` for error responses and error classification.
7. `backendbackendSDD/Adapters/Persistence-adapters.md`, `Rest-adapters.md` and `Use-cases-adapters.md` for technology-specific adapter structure.
8. `backendbackendSDD/Orchestrator-prompt.md` for execution order, diagnostics and gates.

A lower-precedence document must be corrected when it conflicts with a higher-precedence document. A code implementation never overrides an SDD contract silently.

## 2. Stack profiles

### 2.1 Java profile

- Domain ports use synchronous return types unless the project explicitly adopts reactive APIs.
- Persistence uses `Optional`, `List` and domain models at port boundaries.
- REST uses Spring MVC, DTOs, `@RestControllerAdvice` and Bean Validation or an equivalent adapter.
- Build and tests use the detected Maven or Gradle wrapper.

### 2.2 TypeScript profile

- Domain ports preserve the same parameters and operation semantics as Java ports.
- I/O-bound operations return `Promise<T>`; this is the only automatic return-type adaptation.
- Persistence ports use domain models and asynchronous equivalents such as `Promise<T | null>`.
- REST uses the detected Express/Nest adapter, DTO validation, a global error middleware and the same HTTP contract.
- Build and tests use the scripts and lockfile declared by `package.json`.

TypeScript must not add, remove or reorder business parameters merely because the implementation is asynchronous. Any necessary enrichment must happen inside the use case/service through output ports, or be recorded as an explicit contract decision.

## 3. Canonical names

Use these names in new code and documentation:

| Capability | Canonical name | Accepted legacy alias | Rule |
|---|---|---|---|
| Audit persistence port | `AuditLogRepositoryPort` | `AuditRepositoryPort` | Do not create both interfaces; alias only during migration. |
| JWT port | `JwtTokenServicePort` | `JwtServicePort` | TypeScript may use the canonical token-specific name; Java may use `JwtServicePort`; map them to one contract. |
| Product collection | `BankingProduct[]` | `CustomerProducts` | `CustomerProducts` is a transport/application DTO name, not a domain port type. |
| Transfer lookup | `findByIdentifier` | `find` | Adapters may expose `find` internally, but the output port contract is identifier-based. |
| Loan/transfer close | `closeLoan` / lifecycle operation | `delete` | REST DELETE invokes domain closure; it is not physical deletion. |

The orchestrator must report duplicate interfaces or unresolved aliases as `REPAIR_CONTRACT`.

## 4. Input port signature policy

Port signatures are compared by semantic operation, parameter meaning and ordering. Java synchronous returns and TypeScript `Promise` returns are equivalent adaptations.

Canonical semantic signatures:

| Port | Operation | Canonical parameters |
|---|---|---|
| PublicAccess | `login` | `User` |
| PublicAccess | `logout` | `User` |
| PublicAccess | `registerNaturalCustomer` | `NaturalCustomer` |
| PublicAccess | `registerBusinessCustomer` | `BusinessCustomer` |
| PublicAccess | `registerCustomerUser` | `User` |
| NaturalCustomer | `requestLoan` | `User, Loan` |
| NaturalCustomer | `registerLoanPayment` | `User, Loan, amount` |
| NaturalCustomer | `consultMyOperations` | `User` or `User, BankingProduct` only when product-scoped consultation is explicitly required |
| NaturalCustomer | `createTransfer` | `User, Transfer` |
| NaturalCustomer | `executeTransfer` | `User, Transfer` |
| BusinessCustomer | company profile/products/users/loan/transfer operations | `User` plus the affected domain model |
| BusinessOperator | company accounts/transfer/operations | `User` plus the affected domain model when applicable |
| BusinessSupervisor | pending/approve/reject/operations | `User` plus the affected domain model when applicable |
| TellerEmployee | customer/account operations | `User` plus the affected domain model and operation amount when applicable |
| CommercialEmployee | customer/products/loan/account operations | `User` plus the affected domain models |
| InternalAnalyst | employee/customer/user/loan/audit operations | `User` plus the affected domain model and explicit status/destination/filters when required by the operation |

Rules:

1. A parameter required by the REST request must be represented in the domain operation or resolved through an output port before business validation.
2. An adapter may add a transport-only DTO parameter before mapping, but it must not pass DTOs into domain ports.
3. An existing implementation with a broader signature is `PARTIAL` until the SDD documents why the extra domain object is required and tests cover it.
4. The orchestrator must compare signatures using this table and record intentional deviations in the traceability matrix.

## 5. Output port policy

Output ports are technology-independent and use domain models. Java and TypeScript may differ only in optionality and async return wrappers:

- `CustomerRepositoryPort`, `UserRepositoryPort`, `BankAccountRepositoryPort`, `LoanRepositoryPort`, `TransferRepositoryPort`, `OperationRepositoryPort`, `AuditLogRepositoryPort`, `PasswordServicePort`, `JwtTokenServicePort`.
- A Java `Optional<T>` maps to TypeScript `Promise<T | null>`.
- A Java `List<T>` maps to TypeScript `Promise<T[]>`.
- `save` and `update` preserve the same domain object semantics.
- Filtering and paging must use a domain filter object or domain models, never REST DTOs or ORM entities.

`AuditRepositoryPort` and `JwtServicePort` may remain temporary compatibility aliases only if they re-export or extend the canonical port without creating a second contract.

## 6. HTTP status policy

Use one deterministic mapping across both stacks:

| Situation | Status |
|---|---:|
| Malformed JSON, missing field, wrong type, invalid format | 400 |
| Structurally valid request rejected by a distinct semantic validation policy | 422, only when explicitly declared by the endpoint contract |
| Missing/invalid credentials or token | 401 |
| Authenticated user lacks permission or is inactive | 403 |
| Resource not found | 404 |
| Duplicate resource, insufficient balance, invalid lifecycle transition | 409 |
| Database/external dependency unavailable | 503 |
| Unexpected runtime/programming error | 500 |

The current endpoint contracts use `400` for request validation and `409` for business conflicts. Therefore, `422` is not used unless a future endpoint explicitly adds it to `Api-rest-endpoints.md` and `Rest-validation.md`.

The error body is the shape defined in `Global-exception-handler.md` for both stacks.

## 7. REST contract traceability

Maintain a matrix with one row per documented endpoint:

| Method | Path | Input port operation | Request validation | Success status/DTO | Error codes/statuses | Implementation | Tests | State |
|---|---|---|---|---|---|---|---|---|
| `POST` | `/...` | `...` | `...` | `...` | `...` | `...` | `...` | `...` |

An endpoint is `VERIFIED` only when its method, path, validation, use case, response status, error mapping and test all agree.

## 8. Docker and environment policy

- MySQL container port is always `3306`; MongoDB container port is always `27017`.
- Host ports are configurable: `MYSQL_HOST_PORT` defaults to `3306` and may be set to `3308` only when host port `3306` is occupied.
- Inside Compose, the application uses service names such as `mysql-db` and `mongo-db`, never `localhost`.
- Host execution uses `localhost` and the selected host port.
- The selected host port must appear consistently in Compose, `.env.example`, README and the persistent orchestrator state.
- Docker build and integration gates are executed after the application artifacts exist; Compose scaffolding may be prepared earlier.

## 9. Alignment gate

The SDD set is aligned only when:

1. no canonical/legacy naming conflict creates duplicate contracts;
2. input and output port semantics match across Java and TypeScript profiles;
3. REST, validation and exception documents agree for every endpoint;
4. `400`/`422` policy is deterministic;
5. host/container ports and environment variables agree;
6. the endpoint traceability matrix has no unverified rows;
7. the prompt diagnoses every phase and deliverable against this policy;
8. `orchestrator-state.md` records the alignment check, evidence and exit codes.
