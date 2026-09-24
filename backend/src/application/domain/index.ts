/**
 * Domain index - Aggregates the Domain layer public API.
 */

// Models
export { Person } from './models/Person';
export { Customer } from './models/Customer';
export { NaturalCustomer } from './models/NaturalCustomer';
export { BusinessCustomer } from './models/BusinessCustomer';
export { User } from './models/User';
export { BankingProduct } from './models/BankingProduct';
export { BankAccount } from './models/BankAccount';
export { Loan } from './models/Loan';
export { Transfer } from './models/Transfer';
export { Operation } from './models/Operation';
export { AuditLog } from './models/AuditLog';

// Value Objects
export { DomainCatalog } from './valueobjects/DomainCatalog';
export { SystemRole } from './valueobjects/SystemRole';
export { CustomerStatus } from './valueobjects/CustomerStatus';
export { UserStatus } from './valueobjects/UserStatus';
export { AccountStatus } from './valueobjects/AccountStatus';
export { LoanStatus } from './valueobjects/LoanStatus';
export { TransferStatus } from './valueobjects/TransferStatus';
export { AccountType } from './valueobjects/AccountType';
export { LoanType } from './valueobjects/LoanType';
export { OperationType } from './valueobjects/OperationType';
export { Currency } from './valueobjects/Currency';

// Enums
export { ApprovalDecision } from './enums/ApprovalDecision';
export { NotificationChannel } from './enums/NotificationChannel';
export { AuditSeverity } from './enums/AuditSeverity';