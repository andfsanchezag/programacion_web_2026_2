import { User } from '../../../domain/models/User';
import { Customer } from '../../../domain/models/Customer';
import { NaturalCustomer } from '../../../domain/models/NaturalCustomer';
import { BusinessCustomer } from '../../../domain/models/BusinessCustomer';
import { BankAccount } from '../../../domain/models/BankAccount';
import { Loan } from '../../../domain/models/Loan';
import { Transfer } from '../../../domain/models/Transfer';
import { Operation } from '../../../domain/models/Operation';
import { AuditLog } from '../../../domain/models/AuditLog';
import { SystemRole } from '../../../domain/valueobjects/SystemRole';
import { CustomerStatus } from '../../../domain/valueobjects/CustomerStatus';
import { UserStatus } from '../../../domain/valueobjects/UserStatus';
import { AccountType } from '../../../domain/valueobjects/AccountType';
import { AccountStatus } from '../../../domain/valueobjects/AccountStatus';
import { Currency } from '../../../domain/valueobjects/Currency';
import { LoanType } from '../../../domain/valueobjects/LoanType';
import { LoanStatus } from '../../../domain/valueobjects/LoanStatus';
import { TransferStatus } from '../../../domain/valueobjects/TransferStatus';
import {
  LoginRequestDTO, LoginResponseDTO, RegisterNaturalCustomerRequestDTO,
  RegisterBusinessCustomerRequestDTO, RegisterUserRequestDTO, UserResponseDTO,
  CustomerResponseDTO, BankAccountResponseDTO, AccountBalanceResponseDTO,
  RequestLoanRequestDTO, LoanResponseDTO, CreateTransferRequestDTO,
  TransferResponseDTO, OperationResponseDTO, AuditLogResponseDTO,
} from '../dtos/dtos';

/** Mappers RequestDTO ↔ Domain ↔ ResponseDTO. Transporte puro, sin reglas de negocio. */
export class AuthRestMapper {
  static loginToDomain(dto: LoginRequestDTO): User {
    const user = User.forUsernameLookup(dto.username);
    user.replacePassword(dto.password);
    return user;
  }
  static withPassword(user: User, password: string): { username: string; password: string } {
    return { username: user.username, password };
  }
  static toLoginResponse(user: User, token: string, expiresIn: number): LoginResponseDTO {
    return { token, tokenType: 'Bearer', expiresIn,
      user: { userId: user.userId, username: user.username, email: user.email, role: user.role.code } };
  }
  static naturalCustomerToDomain(dto: RegisterNaturalCustomerRequestDTO): NaturalCustomer {
    return new NaturalCustomer(`cus-${dto.identification}`, dto.identification, dto.name,
      dto.email, dto.phoneNumber, dto.address, SystemRole.NATURAL_CUSTOMER,
      CustomerStatus.ACTIVE, new Date(), dto.identification);
  }
  static businessCustomerToDomain(dto: RegisterBusinessCustomerRequestDTO, rep: NaturalCustomer): BusinessCustomer {
    return new BusinessCustomer(`cus-${dto.identification}`, dto.identification, dto.name,
      dto.email, dto.phoneNumber, dto.address, SystemRole.BUSINESS_CUSTOMER,
      CustomerStatus.ACTIVE, new Date(), dto.identification, rep);
  }
  static userToDomain(dto: RegisterUserRequestDTO, customer: Customer | null): User {
    return new User(`usr-${dto.username}`, dto.customerIdentification, dto.username,
      '', '', '', SystemRole.fromCode(dto.role), dto.username, dto.password,
      UserStatus.ACTIVE, customer);
  }
  static toUserResponse(u: User): UserResponseDTO {
    return { userId: u.userId, username: u.username, role: u.role.code, status: u.status.code };
  }
  static toCustomerResponse(c: Customer): CustomerResponseDTO {
    const base = { identification: c.identification, name: c.name, email: c.email,
      status: c.status.code, customerType: (c instanceof BusinessCustomer ? 'BUSINESS' : 'NATURAL') as 'NATURAL' | 'BUSINESS' };
    if (c instanceof BusinessCustomer) {
      return { ...base, legalRepresentative: { identification: c.legalRepresentative.identification, name: c.legalRepresentative.name } };
    }
    return base;
  }
}

export class BankAccountRestMapper {
  static toResponse(a: BankAccount): BankAccountResponseDTO {
    return { accountNumber: a.identifier, accountType: a.accountType.code,
      ownerIdentification: a.owner.identification, availableBalance: a.currentBalance,
      currency: a.currency.isoCode, status: a.accountStatus.code };
  }
  static toBalanceResponse(a: BankAccount): AccountBalanceResponseDTO {
    return { accountNumber: a.identifier, availableBalance: a.currentBalance, currency: a.currency.isoCode };
  }
  static openToDomain(accountNumber: string, type: string, owner: Customer, currencyIso: string): BankAccount {
    return new BankAccount(accountNumber, AccountType.fromCode(type), owner,
      Currency.fromIsoCode(currencyIso), new Date(), 0, AccountStatus.ACTIVE);
  }
}

export class LoanRestMapper {
  static requestToDomain(dto: RequestLoanRequestDTO, applicant: Customer, dest: BankAccount, loanId: string): Loan {
    return new Loan(loanId, applicant, LoanType.fromCode(dto.loanType), dto.requestedAmount,
      0, dto.termInMonths, dest, 0, LoanStatus.UNDER_REVIEW, null, null);
  }
  static toResponse(l: Loan): LoanResponseDTO {
    return { loanId: l.identifier, loanType: l.loanType.code, requestedAmount: l.requestedAmount,
      approvedAmount: l.approvedAmount, status: l.loanStatus.code, termInMonths: l.termInMonths };
  }
}

export class TransferRestMapper {
  static createToDomain(dto: CreateTransferRequestDTO, src: BankAccount, dst: BankAccount,
    createdBy: User, transferId: string): Transfer {
    return new Transfer(transferId, src, dst, dto.amount, new Date(), createdBy, TransferStatus.PENDING, null, null);
  }
  static toResponse(t: Transfer): TransferResponseDTO {
    return { transferId: t.identifier, sourceAccountNumber: t.sourceAccount.identifier,
      destinationAccountNumber: t.destinationAccount.identifier, amount: t.amount,
      status: t.transferStatus.code,
      executedAt: t.transferStatus.equals(TransferStatus.EXECUTED) ? t.creationDate.toISOString() : undefined };
  }
}

export class OperationRestMapper {
  static toResponse(o: Operation): OperationResponseDTO {
    return { operationId: o.operationId, operationType: o.operationType.code,
      executionDate: o.executionDate.toISOString(), performedBy: o.performedBy.username,
      affectedProduct: o.affectedProduct.identifier };
  }
  static auditToResponse(a: AuditLog): AuditLogResponseDTO {
    const details: Record<string, unknown> = {};
    a.details.forEach((v: unknown, k: string) => { details[k] = v; });
    return { auditId: a.auditId, operationType: a.operationType.code,
      operationDate: a.operationDate.toISOString(), performedBy: a.performedBy.username,
      userRole: a.userRole.code, affectedProduct: a.affectedProduct.identifier, details };
  }
}
