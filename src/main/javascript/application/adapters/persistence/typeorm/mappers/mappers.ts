import { BankAccount } from '../../../../domain/models/BankAccount';
import { Customer } from '../../../../domain/models/Customer';
import { NaturalCustomer } from '../../../../domain/models/NaturalCustomer';
import { BusinessCustomer } from '../../../../domain/models/BusinessCustomer';
import { User } from '../../../../domain/models/User';
import { Loan } from '../../../../domain/models/Loan';
import { Transfer } from '../../../../domain/models/Transfer';
import { Operation } from '../../../../domain/models/Operation';
import { AccountStatus } from '../../../../domain/valueobjects/AccountStatus';
import { AccountType } from '../../../../domain/valueobjects/AccountType';
import { Currency } from '../../../../domain/valueobjects/Currency';
import { CustomerStatus } from '../../../../domain/valueobjects/CustomerStatus';
import { SystemRole } from '../../../../domain/valueobjects/SystemRole';
import { UserStatus } from '../../../../domain/valueobjects/UserStatus';
import { LoanStatus } from '../../../../domain/valueobjects/LoanStatus';
import { LoanType } from '../../../../domain/valueobjects/LoanType';
import { TransferStatus } from '../../../../domain/valueobjects/TransferStatus';
import { OperationType } from '../../../../domain/valueobjects/OperationType';
import {
  BankAccountEntity, CustomerEntity, UserEntity, LoanEntity, TransferEntity, OperationEntity,
} from '../entities/entities';

/** Mappers bidireccionales Dominio ↔ Entidad relacional. No filtran fuera del adapter. */
export class BankAccountTypeOrmMapper {
  static toEntity(d: BankAccount): BankAccountEntity {
    if (!d) return d as unknown as BankAccountEntity;
    return {
      accountNumber: d.identifier,
      accountType: d.accountType.code,
      customerIdentification: d.owner.identification,
      balance: d.currentBalance,
      currency: d.currency.isoCode,
      status: d.accountStatus.code,
      openingDate: d.openingDate.toISOString(),
    };
  }
  static toDomain(e: BankAccountEntity, owner: Customer): BankAccount {
    if (!e) return e as unknown as BankAccount;
    return new BankAccount(
      e.accountNumber, AccountType.fromCode(e.accountType), owner,
      Currency.fromIsoCode(e.currency), new Date(e.openingDate),
      e.balance, AccountStatus.fromCode(e.status),
    );
  }
}

export class CustomerTypeOrmMapper {
  static toEntity(d: Customer): CustomerEntity {
    const isBusiness = d instanceof BusinessCustomer;
    const base = {
      customerId: d.customerId, identification: d.identification, name: d.name,
      email: d.email, phone: d.phone, address: d.address, role: d.role.code,
      status: d.status.code, registrationDate: d.registrationDate.toISOString(),
      customerKind: (isBusiness ? 'BUSINESS' : 'NATURAL') as 'NATURAL' | 'BUSINESS',
    };
    if (d instanceof BusinessCustomer) {
      return { ...base, taxId: d.taxIdentificationNumber,
        legalRepresentativeIdentification: d.legalRepresentative.identification, nationalId: null };
    }
    return { ...base, nationalId: (d as NaturalCustomer).nationalIdentificationNumber ?? d.identification,
      taxId: null, legalRepresentativeIdentification: null };
  }
  static toDomain(e: CustomerEntity, legalRep?: NaturalCustomer): Customer {
    if (e.customerKind === 'BUSINESS') {
      if (!legalRep) throw new Error('BusinessCustomer requiere representante legal para mapeo a dominio');
      return new BusinessCustomer(e.customerId, e.identification, e.name, e.email, e.phone,
        e.address, SystemRole.fromCode(e.role), CustomerStatus.fromCode(e.status),
        new Date(e.registrationDate), e.taxId ?? e.identification, legalRep);
    }
    return new NaturalCustomer(e.customerId, e.identification, e.name, e.email, e.phone,
      e.address, SystemRole.fromCode(e.role), CustomerStatus.fromCode(e.status),
      new Date(e.registrationDate), e.nationalId ?? e.identification);
  }
}

export class UserTypeOrmMapper {
  static toEntity(d: User): UserEntity {
    return { userId: d.userId, identification: d.identification, name: d.name, email: d.email,
      phone: d.phone, address: d.address, role: d.role.code, username: d.username,
      passwordHash: d.passwordHash, status: d.status.code,
      customerIdentification: d.customer ? d.customer.identification : null };
  }
  static toDomain(e: UserEntity, customer: Customer | null = null): User {
    return new User(e.userId, e.identification, e.name, e.email, e.phone, e.address,
      SystemRole.fromCode(e.role), e.username, e.passwordHash,
      UserStatus.fromCode(e.status), customer);
  }
}

export class LoanTypeOrmMapper {
  static toEntity(d: Loan): LoanEntity {
    return { loanId: d.identifier, applicantIdentification: d.applicant.identification,
      loanType: d.loanType.code, requestedAmount: d.requestedAmount, approvedAmount: d.approvedAmount,
      interestRate: d.interestRate, termInMonths: d.termInMonths, status: d.loanStatus.code,
      approvalDate: d.approvalDate ? d.approvalDate.toISOString() : null,
      disbursementDate: d.disbursementDate ? d.disbursementDate.toISOString() : null,
      destinationAccountNumber: d.destinationAccount.identifier };
  }
  static toDomain(e: LoanEntity, applicant: Customer, dest: BankAccount): Loan {
    return new Loan(e.loanId, applicant, LoanType.fromCode(e.loanType), e.requestedAmount,
      e.interestRate, e.termInMonths, dest, e.approvedAmount,
      LoanStatus.fromCode(e.status),
      e.approvalDate ? new Date(e.approvalDate) : null,
      e.disbursementDate ? new Date(e.disbursementDate) : null);
  }
}

export class TransferTypeOrmMapper {
  static toEntity(d: Transfer): TransferEntity {
    return { transferId: d.identifier, sourceAccountNumber: d.sourceAccount.identifier,
      destinationAccountNumber: d.destinationAccount.identifier, amount: d.amount,
      creationDate: d.creationDate.toISOString(),
      approvalDate: d.approvalDate ? d.approvalDate.toISOString() : null,
      status: d.transferStatus.code, createdByUsername: d.createdBy.username,
      approvedByUsername: d.approvedBy ? d.approvedBy.username : null };
  }
  static toDomain(e: TransferEntity, src: BankAccount, dst: BankAccount, createdBy: User, approvedBy: User | null): Transfer {
    return new Transfer(e.transferId, src, dst, e.amount, new Date(e.creationDate),
      createdBy, TransferStatus.fromCode(e.status),
      e.approvalDate ? new Date(e.approvalDate) : null, approvedBy);
  }
}

export class OperationTypeOrmMapper {
  static toEntity(d: Operation): OperationEntity {
    return { operationId: d.operationId, operationType: d.operationType.code,
      executionDate: d.executionDate.toISOString(),
      performedByUsername: d.performedBy.username,
      affectedProductIdentifier: d.affectedProduct.identifier };
  }
}
