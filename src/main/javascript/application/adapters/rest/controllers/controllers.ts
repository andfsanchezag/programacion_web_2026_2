import { PublicAccessPort } from '../../../domain/ports/in/PublicAccessPort';
import { NaturalCustomerPort } from '../../../domain/ports/in/NaturalCustomerPort';
import { BusinessCustomerPort } from '../../../domain/ports/in/BusinessCustomerPort';
import { BusinessOperatorPort } from '../../../domain/ports/in/BusinessOperatorPort';
import { BusinessSupervisorPort } from '../../../domain/ports/in/BusinessSupervisorPort';
import { TellerEmployeePort } from '../../../domain/ports/in/TellerEmployeePort';
import { CommercialEmployeePort } from '../../../domain/ports/in/CommercialEmployeePort';
import { InternalAnalystPort } from '../../../domain/ports/in/InternalAnalystPort';
import { User } from '../../../domain/models/User';
import { NaturalCustomer } from '../../../domain/models/NaturalCustomer';
import { BankAccount } from '../../../domain/models/BankAccount';
import { Loan } from '../../../domain/models/Loan';
import { Transfer } from '../../../domain/models/Transfer';
import { Customer } from '../../../domain/models/Customer';
import { AuthRestMapper, BankAccountRestMapper, LoanRestMapper, TransferRestMapper, OperationRestMapper } from '../mappers/rest.mappers';
import {
  LoginRequestDTO, RegisterNaturalCustomerRequestDTO, RegisterBusinessCustomerRequestDTO,
  RegisterUserRequestDTO, UpdateCustomerProfileRequestDTO, RequestLoanRequestDTO,
  CreateTransferRequestDTO, DepositRequestDTO, WithdrawalRequestDTO,
  RegisterCompanyUserRequestDTO, ChangeCustomerStatusRequestDTO, ApproveLoanRequestDTO,
} from '../dtos/dtos';

/**
 * Controladores REST por rol (rutas según SDD/Adapters/Api-rest-endpoints.md).
 * Reciben el `User` de dominio reconstruido desde el JWT y delegan al Input Port.
 * Sin lógica de negocio: solo mapeo DTO ↔ dominio y códigos HTTP sugeridos.
 */
export const ROUTES = {
  login: 'POST /api/v1/auth/login',
  logout: 'POST /api/v1/auth/logout',
  registerNatural: 'POST /api/v1/auth/register/natural-customer',
  registerBusiness: 'POST /api/v1/auth/register/business-customer',
  registerUser: 'POST /api/v1/auth/register/user',
  naturalProfile: 'GET /api/v1/natural-customer/profile',
  naturalAccounts: 'GET /api/v1/natural-customer/accounts',
  naturalBalance: 'GET /api/v1/natural-customer/accounts/{accountNumber}/balance',
  naturalLoans: 'POST /api/v1/natural-customer/loans',
  naturalTransfers: 'POST /api/v1/natural-customer/transfers',
  naturalOperations: 'GET /api/v1/natural-customer/operations',
  tellerDeposit: 'POST /api/v1/teller/accounts/{accountNumber}/deposits',
  tellerWithdraw: 'POST /api/v1/teller/accounts/{accountNumber}/withdrawals',
  tellerBlock: 'PATCH /api/v1/teller/accounts/{accountNumber}/block',
  analystApproveLoan: 'PATCH /api/v1/internal-analyst/loans/{loanId}/approve',
  analystDisburse: 'POST /api/v1/internal-analyst/loans/{loanId}/disburse',
  analystAudit: 'GET /api/v1/internal-analyst/audit-logs',
  analystDeleteLoan: 'DELETE /api/v1/internal-analyst/loans/{loanId}',
} as const;

export class AuthController {
  constructor(private readonly port: PublicAccessPort) {}
  async login(dto: LoginRequestDTO) {
    const user = AuthRestMapper.loginToDomain(dto);
    const r = await this.port.login(user);
    return { status: 200 as const, body: { token: r.token, tokenType: 'Bearer' as const, expiresIn: 3600,
      user: { userId: user.userId, username: r.username, email: user.email, role: r.role.code } } };
  }
  async logout(user: User) { await this.port.logout(user); return { status: 204 as const, body: undefined }; }
  async registerNatural(dto: RegisterNaturalCustomerRequestDTO) {
    const c = await this.port.registerNaturalCustomer(AuthRestMapper.naturalCustomerToDomain(dto));
    return { status: 201 as const, body: AuthRestMapper.toCustomerResponse(c) };
  }
  async registerBusiness(dto: RegisterBusinessCustomerRequestDTO, rep: NaturalCustomer) {
    const c = await this.port.registerBusinessCustomer(AuthRestMapper.businessCustomerToDomain(dto, rep));
    return { status: 201 as const, body: AuthRestMapper.toCustomerResponse(c) };
  }
  async registerUser(dto: RegisterUserRequestDTO, customer: Customer | null) {
    const u = await this.port.registerCustomerUser(AuthRestMapper.userToDomain(dto, customer));
    return { status: 201 as const, body: AuthRestMapper.toUserResponse(u) };
  }
}

export class NaturalCustomerController {
  constructor(private readonly port: NaturalCustomerPort) {}
  async getProfile(user: User) {
    return { status: 200 as const, body: AuthRestMapper.toCustomerResponse(await this.port.consultMyProfile(user)) };
  }
  async updateProfile(user: User, current: Customer, dto: UpdateCustomerProfileRequestDTO) {
    if (dto.email) current.updateContactInformation(dto.email, current.phone, current.address);
    return { status: 200 as const, body: AuthRestMapper.toCustomerResponse(await this.port.updateMyProfile(user, current)) };
  }
  async getAccounts(user: User) {
    return { status: 200 as const, body: (await this.port.consultMyAccounts(user)).map(BankAccountRestMapper.toResponse) };
  }
  async getBalance(user: User, account: BankAccount) {
    const balance = await this.port.consultAccountBalance(user, account);
    return { status: 200 as const, body: { accountNumber: account.identifier, availableBalance: balance, currency: account.currency.isoCode } };
  }
  async requestLoan(user: User, customer: Customer, loan: Loan) {
    return { status: 201 as const, body: LoanRestMapper.toResponse(await this.port.requestLoan(user, customer, loan)) };
  }
  async createTransfer(user: User, transfer: Transfer) {
    return { status: 201 as const, body: TransferRestMapper.toResponse(await this.port.createTransfer(user, transfer)) };
  }
  async getOperations(user: User, product: BankAccount) {
    return { status: 200 as const, body: (await this.port.consultMyOperations(user, product)).map(OperationRestMapper.toResponse) };
  }
}

export class BusinessCustomerController {
  constructor(private readonly port: BusinessCustomerPort) {}
  async registerCompanyUser(user: User, domain: User) {
    return { status: 201 as const, body: AuthRestMapper.toUserResponse(await this.port.registerCompanyUser(user, domain)) };
  }
  async approveTransfer(user: User, t: Transfer) {
    return { status: 200 as const, body: TransferRestMapper.toResponse(await this.port.approveCompanyTransfer(user, t)) };
  }
  async rejectTransfer(user: User, t: Transfer) {
    return { status: 200 as const, body: TransferRestMapper.toResponse(await this.port.rejectCompanyTransfer(user, t)) };
  }
}

export class BusinessOperatorController {
  constructor(private readonly port: BusinessOperatorPort) {}
  async createTransfer(user: User, t: Transfer) {
    // 202 Accepted: puede quedar WAITING_FOR_APPROVAL según umbral configurable
    return { status: 202 as const, body: TransferRestMapper.toResponse(await this.port.createCompanyTransfer(user, t)) };
  }
}

export class BusinessSupervisorController {
  constructor(private readonly port: BusinessSupervisorPort) {}
  async pending(user: User) {
    return { status: 200 as const, body: (await this.port.consultPendingTransfers(user)).map(TransferRestMapper.toResponse) };
  }
  async approve(user: User, t: Transfer) {
    return { status: 200 as const, body: TransferRestMapper.toResponse(await this.port.approveTransfer(user, t)) };
  }
}

export class TellerController {
  constructor(private readonly port: TellerEmployeePort) {}
  async deposit(user: User, account: BankAccount, dto: DepositRequestDTO) {
    const updated = await this.port.depositFunds(user, account, dto.amount);
    return { status: 200 as const, body: BankAccountRestMapper.toBalanceResponse(updated) };
  }
  async withdraw(user: User, account: BankAccount, dto: WithdrawalRequestDTO) {
    const updated = await this.port.withdrawFunds(user, account, dto.amount);
    return { status: 200 as const, body: BankAccountRestMapper.toBalanceResponse(updated) };
  }
  async block(user: User, account: BankAccount) {
    return { status: 200 as const, body: BankAccountRestMapper.toResponse(await this.port.blockBankAccount(user, account)) };
  }
}

export class CommercialController {
  constructor(private readonly port: CommercialEmployeePort) {}
  async requestLoan(user: User, customer: Customer, loan: Loan) {
    return { status: 201 as const, body: LoanRestMapper.toResponse(await this.port.requestLoanOnBehalfOfCustomer(user, customer, loan)) };
  }
}

export class InternalAnalystController {
  constructor(private readonly port: InternalAnalystPort) {}
  async approveLoan(user: User, loan: Loan, _dto: ApproveLoanRequestDTO) {
    return { status: 200 as const, body: LoanRestMapper.toResponse(await this.port.approveLoan(user, loan)) };
  }
  async disburseLoan(user: User, loan: Loan) {
    return { status: 200 as const, body: LoanRestMapper.toResponse(await this.port.disburseLoan(user, loan)) };
  }
  async auditLog(user: User, product: BankAccount) {
    const content = (await this.port.consultAuditLog(user, product)).map(OperationRestMapper.auditToResponse);
    return { status: 200 as const, body: { content, totalElements: content.length, totalPages: 1 } };
  }
  async changeCustomerStatus(user: User, customer: Customer, _dto: ChangeCustomerStatusRequestDTO) {
    void _dto;
    return { status: 200 as const, body: AuthRestMapper.toCustomerResponse(await this.port.changeCustomerStatus(user, customer)) };
  }
  deleteLoan(user: User, loan: Loan) {
    void user; void loan;
    return { status: 204 as const, body: undefined };
  }
}

export type {
  RequestLoanRequestDTO, CreateTransferRequestDTO, DepositRequestDTO, WithdrawalRequestDTO,
  RegisterCompanyUserRequestDTO, ChangeCustomerStatusRequestDTO, ApproveLoanRequestDTO,
  UpdateCustomerProfileRequestDTO, RegisterUserRequestDTO, LoginRequestDTO,
  RegisterNaturalCustomerRequestDTO, RegisterBusinessCustomerRequestDTO,
};
