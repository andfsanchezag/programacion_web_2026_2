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
import { reqString, reqEmail, reqPhone, reqDate, reqNumber } from '../validation/requestValidation';

/** Mappers RequestDTO ↔ Domain ↔ ResponseDTO. Valida el DTO ANTES de mapear. */
export class AuthRestMapper {
  static loginToDomain(dto: LoginRequestDTO): User {
    const username = reqString(dto?.username, 'username', { min: 3, max: 40 }) as string;
    const password = reqString(dto?.password, 'password', { min: 8, max: 100 }) as string;
    const user = User.forUsernameLookup(username);
    user.replacePassword(password);
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
    const identification = reqString(dto?.identification, 'identification', { max: 30 }) as string;
    reqDate(dto?.birthDate, 'birthDate', { past: true });
    return new NaturalCustomer(`cus-${identification}`, identification,
      reqString(dto?.name, 'name', { max: 120 }) as string,
      reqEmail(dto?.email, 'email') as string,
      reqPhone(dto?.phoneNumber, 'phoneNumber') as string,
      reqString(dto?.address, 'address') as string,
      SystemRole.NATURAL_CUSTOMER, CustomerStatus.ACTIVE, new Date(), identification);
  }
  static businessCustomerToDomain(dto: RegisterBusinessCustomerRequestDTO, rep: NaturalCustomer): BusinessCustomer {
    const identification = reqString(dto?.identification, 'identification', { max: 30 }) as string;
    return new BusinessCustomer(`cus-${identification}`, identification,
      reqString(dto?.name, 'name', { max: 120 }) as string,
      reqEmail(dto?.email, 'email') as string,
      reqPhone(dto?.phoneNumber, 'phoneNumber') as string,
      reqString(dto?.address, 'address') as string,
      SystemRole.BUSINESS_CUSTOMER, CustomerStatus.ACTIVE, new Date(), identification, rep);
  }
  static userToDomain(dto: RegisterUserRequestDTO, customer: Customer | null): User {
    const username = reqString(dto?.username, 'username', { min: 3, max: 40 }) as string;
    return new User(`usr-${username}`,
      reqString(dto?.customerIdentification, 'customerIdentification', { max: 30 }) as string,
      username, '', '', '', SystemRole.fromCode(reqString(dto?.role, 'role', { max: 40 }) as string),
      username,
      reqString(dto?.password, 'password', { min: 8, max: 100 }) as string,
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
    return new BankAccount(
      reqString(accountNumber, 'accountNumber', { max: 30 }) as string,
      AccountType.fromCode(type), owner,
      Currency.fromIsoCode(currencyIso), new Date(), 0, AccountStatus.ACTIVE);
  }
}

export class LoanRestMapper {
  static requestToDomain(dto: RequestLoanRequestDTO, applicant: Customer, dest: BankAccount, loanId: string): Loan {
    return new Loan(loanId, applicant, LoanType.fromCode(dto.loanType),
      reqNumber(dto?.requestedAmount, 'requestedAmount', { min: 0.01 }) as number,
      0,
      reqNumber(dto?.termInMonths, 'termInMonths', { min: 1, integer: true }) as number,
      dest, 0, LoanStatus.UNDER_REVIEW, null, null);
  }
  static toResponse(l: Loan): LoanResponseDTO {
    return { loanId: l.identifier, loanType: l.loanType.code, requestedAmount: l.requestedAmount,
      approvedAmount: l.approvedAmount, status: l.loanStatus.code, termInMonths: l.termInMonths };
  }
}

export class TransferRestMapper {
  static createToDomain(dto: CreateTransferRequestDTO, src: BankAccount, dst: BankAccount,
    createdBy: User, transferId: string): Transfer {
    reqString(dto?.description, 'description', { optional: true, max: 280 });
    return new Transfer(transferId, src, dst,
      reqNumber(dto?.amount, 'amount', { min: 0.01 }) as number,
      new Date(), createdBy, TransferStatus.PENDING, null, null);
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
