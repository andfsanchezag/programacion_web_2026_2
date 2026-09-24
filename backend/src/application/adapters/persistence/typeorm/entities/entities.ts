/** Entidad relacional BankAccount (forma TypeORM: tabla `bank_accounts`, MySQL 3306). */
export interface BankAccountEntity {
  accountNumber: string;
  accountType: string;
  customerIdentification: string;
  balance: number;
  currency: string;
  status: string;
  openingDate: string;
}

/** Entidad relacional Customer (tablas customer/natural/business). */
export interface CustomerEntity {
  customerId: string;
  identification: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  status: string;
  registrationDate: string;
  customerKind: 'NATURAL' | 'BUSINESS';
  nationalId?: string | null;
  taxId?: string | null;
  legalRepresentativeIdentification?: string | null;
}

/** Entidad relacional User (tabla `users`). */
export interface UserEntity {
  userId: string;
  identification: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  username: string;
  passwordHash: string;
  status: string;
  customerIdentification?: string | null;
}

/** Entidad relacional Loan (tabla `loans`). */
export interface LoanEntity {
  loanId: string;
  applicantIdentification: string;
  loanType: string;
  requestedAmount: number;
  approvedAmount: number;
  interestRate: number;
  termInMonths: number;
  status: string;
  approvalDate?: string | null;
  disbursementDate?: string | null;
  destinationAccountNumber: string;
}

/** Entidad relacional Transfer (tabla `transfers`). */
export interface TransferEntity {
  transferId: string;
  sourceAccountNumber: string;
  destinationAccountNumber: string;
  amount: number;
  creationDate: string;
  approvalDate?: string | null;
  status: string;
  createdByUsername: string;
  approvedByUsername?: string | null;
}

/** Entidad relacional Operation (tabla `operations`). */
export interface OperationEntity {
  operationId: string;
  operationType: string;
  executionDate: string;
  performedByUsername: string;
  affectedProductIdentifier: string;
}
