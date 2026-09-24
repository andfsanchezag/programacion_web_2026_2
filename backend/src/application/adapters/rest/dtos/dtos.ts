/** Request/Response DTOs HTTP (adapters/rest). Sin lógica de negocio; solo transporte. */

export interface LoginRequestDTO { username: string; password: string; }
export interface LoginResponseDTO {
  token: string; tokenType: 'Bearer'; expiresIn: number;
  user: { userId: string; username: string; email: string; role: string };
}

export interface RegisterNaturalCustomerRequestDTO {
  identification: string; name: string; email: string;
  phoneNumber: string; address: string; birthDate: string;
}
export interface RegisterBusinessCustomerRequestDTO {
  identification: string; name: string; email: string;
  phoneNumber: string; address: string; legalRepresentativeIdentification: string;
}
export interface RegisterUserRequestDTO {
  customerIdentification: string; username: string; password: string; role: string;
}
export interface UserResponseDTO { userId: string; username: string; role: string; status: string; }

export interface CustomerResponseDTO {
  identification: string; name: string; email: string; status: string; customerType: 'NATURAL' | 'BUSINESS';
  legalRepresentative?: { identification: string; name: string };
}
export interface UpdateCustomerProfileRequestDTO { email?: string; phoneNumber?: string; address?: string; }

export interface BankAccountResponseDTO {
  accountNumber: string; accountType: string; ownerIdentification: string;
  availableBalance: number; currency: string; status: string;
}
export interface AccountBalanceResponseDTO { accountNumber: string; availableBalance: number; currency: string; }
export interface DepositRequestDTO { amount: number; reference?: string; }
export interface WithdrawalRequestDTO { amount: number; clientIdentification?: string; }
export interface BlockAccountRequestDTO { reason: string; }

export interface RequestLoanRequestDTO {
  loanType: string; requestedAmount: number; termInMonths: number; destinationAccountNumber: string;
}
export interface CommercialRequestLoanRequestDTO extends RequestLoanRequestDTO { customerIdentification: string; }
export interface ApproveLoanRequestDTO { approvedAmount: number; interestRate: number; }
export interface LoanResponseDTO {
  loanId: string; loanType: string; requestedAmount: number;
  approvedAmount?: number; status: string; termInMonths: number;
}
export interface LoanPaymentRequestDTO { sourceAccountNumber: string; amount: number; }
export interface LoanPaymentResponseDTO { loanId: string; status: string; }

export interface CreateTransferRequestDTO {
  sourceAccountNumber: string; destinationAccountNumber: string; amount: number; description?: string;
}
export interface RejectTransferRequestDTO { rejectionReason: string; }
export interface TransferResponseDTO {
  transferId: string; sourceAccountNumber: string; destinationAccountNumber: string;
  amount: number; status: string; executedAt?: string;
}

export interface OperationResponseDTO {
  operationId: string; operationType: string; executionDate: string;
  performedBy: string; affectedProduct: string;
}
export interface AuditLogResponseDTO {
  auditId: string; operationType: string; operationDate: string;
  performedBy: string; userRole: string; affectedProduct: string;
  details: Record<string, unknown>;
}
export interface RegisterCompanyUserRequestDTO {
  username: string; password: string; role: string; email: string; identification: string; name: string;
}
export interface RegisterEmployeeUserRequestDTO extends RegisterCompanyUserRequestDTO {}
export interface ChangeCustomerStatusRequestDTO { status: string; reason?: string; }
