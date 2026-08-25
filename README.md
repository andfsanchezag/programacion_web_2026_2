# programacion_web_2026_2

## Overview

This is a comprehensive Banking Information Management System built using Domain-Driven Design principles with TypeScript and modern JavaScript. The project represents a complete domain model for a banking institution, featuring core domain entities, value objects, services, and comprehensive test coverage.

## Project Summary

- **Type**: Banking Domain Model / Domain-Driven Design Application
- **Language**: TypeScript (ES2020+ with strict mode)
- **Architecture**: Hexagonal Architecture with Domain Model focus
- **Testing**: Comprehensive unit testing with Vitest framework
- **License**: MIT

## Key Features

### Core Domain Entities
- **Customer**: Abstract base class for banking customers (individuals and organizations)
- **User**: System identity for authentication and authorization
- **BankAccount**: Financial products owned by customers
- **Loan**: Credit products requested by customers
- **Person**: Abstract base class for all identifiable persons in the system
- **BankingProduct**: Abstract base class for all financial products and services

### Value Objects
- **Currency**: Financial currency with ISO code and precision
- **AccountStatus**: Lifecycle states for bank accounts
- **CustomerStatus**: Lifecycle states for customers
- **AccountType**: Types of bank accounts (checking, savings, etc.)
- **LoanType**: Types of loan products
- **LoanStatus**: Lifecycle states for loans
- **SystemRole**: Security roles and permissions

### Services
- **CustomerService**: Manages customer lifecycle operations
- **BankAccountService**: Handles account operations (activate, block, deposit, withdraw, etc.)
- **LoanService**: Manages loan lifecycle (approve, reject, disburse, etc.)

### Exception Handling
Comprehensive domain exceptions for all failure scenarios:
- Authentication and authorization errors
- Account operation errors
- Loan processing errors
- Customer validation errors

## Technology Stack

### Runtime
- **Node.js**: JavaScript/TypeScript runtime environment
- **TypeScript**: ^4.0.0 (strict mode enabled)
- **Vitest**: ^3.2.7 (testing framework)

### Development Tools
- **tsx**: ^4.23.12 (TypeScript runner)
- **@vitest/coverage-v8**: ^3.2.7 (coverage reporting)
- **TypeScript compiler**: Built-in for compilation

### Architecture Features
- **Domain-Driven Design**: Business logic encapsulated in domain entities
- **Hexagonal Architecture**: Clear ports and adapters
- **Clean Code**: Comprehensive JSDoc documentation
- **Test Coverage**: 100% test coverage on business logic

## Project Structure

```
src/main/javascript/
├── application/
│   ├── domain/
│   │   ├── models/          # Core domain entities
│   │   │   ├── BankAccount.ts
│   │   │   ├── Customer.ts
│   │   │   ├── Loan.ts
│   │   │   ├── User.ts
│   │   │   └── Person.ts
│   │   ├── enums/            # Currency, AccountType, etc.
│   │   ├── valueobjects/     # Domain primitives
│   │   ├── exceptions/       # Domain errors
│   │   └── services/         # Application services
│   └── infrastructure/      # External concerns (if any)
├── test/                   # Comprehensive test suite
│   ├── domain/            # Domain model tests
│   └── infrastructure/    # Infrastructure tests
├── package.json           # Project configuration
├── tsconfig.json          # TypeScript configuration
└── vitest.config.ts       # Testing configuration
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- TypeScript compiler

### Installation

```bash
# Navigate to the project directory
cd programacion_web_2026_2

# Install dependencies (if needed)
npm install
```

### Building

```bash
# Build TypeScript code
npm run build

# Build output: compiled JavaScript in dist/ directory
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run coverage

# Run specific test files
# vitest src/main/javascript/test/domain/models/BankAccount.test.ts
```

### Development

The project includes comprehensive unit tests for all domain entities:
- Account operations (activate, block, close, transfer)
- Loan processing (approve, reject, disburse, close)
- Customer management
- Authentication and authorization
- Currency and financial calculations

## Business Logic Examples

### Bank Account Operations
```typescript
// Create a new bank account
const account = new BankAccount(
  'ACC-12345',
  AccountType.CHECKING,
  customer,
  Currency.USD,
  new Date()
);

// Deposit funds
account.deposit(1000);

// Withdraw funds
account.withdraw(500);

// Transfer between accounts
account.transferOut(200); // From this account
account.transferIn(200);  // To another account
```

### Loan Processing
```typescript
// Create a loan application
const loan = new Loan(
  'LOAN-67890',
  customer,
  LoanType.HOUSE_MORTGAGE,
  50000,
  5.5,
  360,
  destinationAccount
);

// Approve loan
loan.approve(50000, new Date());

// Disburse funds
loan.disburse(new Date());
```

### Customer Management
```typescript
// Create and activate customer
customer.activate();

// Block customer
customer.block();

// Validate customer status
customer.validateRegistration();
```

## Architecture Principles

### Domain-Driven Design
- **Entities**: Objects with identity and state (User, Customer, BankAccount, Loan)
- **Value Objects**: Immutable objects with value semantics (Currency, Status)
- **Aggregates**: Groups of related objects (Customer with related accounts/loans)
- **Factories**: Object creation with business rules
- **Repositories**: Data access abstraction for domain objects

### Clean Architecture
- **Core**: Domain models and business rules
- **Service Layer**: Application services coordinating domain operations
- **Infrastructure**: External concerns (database, external APIs)

### Test Coverage
100% test coverage on business logic with:
- Unit tests for individual domain methods
- Integration tests for business workflows
- Mocks and stubs for external dependencies

## Business Domain Covered

This system models a complete banking environment with:
- Customer lifecycle management
- Multi-currency support
- Account operations (deposit, withdraw, transfer)
- Loan processing and management
- Security and authentication
- Customer and account status management
- Financial calculations and validations

## Testing Approach

The project emphasizes test-driven development with:
- **Unit Tests**: Isolated testing of domain entities
- **Edge Cases**: Comprehensive boundary condition testing
- **Error Scenarios**: Validation of exception handling
- **Business Rules**: Testing all domain invariants

## Future Enhancements

Potential areas for extension:
- **Database Integration**: PostgreSQL/MySQL for persistence
- **API Layer**: REST/GraphQL API for external access
- **Additional Products**: Credit cards, debit cards, investments
- **Reporting**: Financial reports and analytics
- **Notifications**: Email/SMS notifications
- **Fraud Detection**: ML-based anomaly detection

## Credits

Created by andfsanchezag as part of an educational endeavor to demonstrate:
- Domain-Driven Design implementation
- TypeScript best practices
- Clean architecture principles
- Comprehensive testing strategies

This repository serves as a reference implementation for building complex business applications with proper domain modeling and architectural patterns.
