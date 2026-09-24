import { describe, it, expect } from 'vitest';
import {
  BankAccountTypeOrmMapper, CustomerTypeOrmMapper, UserTypeOrmMapper,
  LoanTypeOrmMapper, TransferTypeOrmMapper, OperationTypeOrmMapper,
} from '../../src/application/adapters/persistence/typeorm/mappers/mappers';
import { BankAccount } from '../../src/application/domain/models/BankAccount';
import { NaturalCustomer } from '../../src/application/domain/models/NaturalCustomer';
import { BusinessCustomer } from '../../src/application/domain/models/BusinessCustomer';
import { User } from '../../src/application/domain/models/User';
import { Loan } from '../../src/application/domain/models/Loan';
import { Transfer } from '../../src/application/domain/models/Transfer';
import { Operation } from '../../src/application/domain/models/Operation';
import { AccountStatus } from '../../src/application/domain/valueobjects/AccountStatus';
import { AccountType } from '../../src/application/domain/valueobjects/AccountType';
import { Currency } from '../../src/application/domain/valueobjects/Currency';
import { CustomerStatus } from '../../src/application/domain/valueobjects/CustomerStatus';
import { SystemRole } from '../../src/application/domain/valueobjects/SystemRole';
import { UserStatus } from '../../src/application/domain/valueobjects/UserStatus';
import { LoanStatus } from '../../src/application/domain/valueobjects/LoanStatus';
import { LoanType } from '../../src/application/domain/valueobjects/LoanType';
import { TransferStatus } from '../../src/application/domain/valueobjects/TransferStatus';
import { OperationType } from '../../src/application/domain/valueobjects/OperationType';
import { makeCustomer, makeUser, makeBankAccount, makeBusinessCustomer, NOW } from '../helpers';

describe('TypeORM mappers bidireccionales', () => {
  it('BankAccount: guards nulos + round-trip completo', () => {
    expect(BankAccountTypeOrmMapper.toEntity(null as never)).toBeNull();
    expect(BankAccountTypeOrmMapper.toDomain(null as never, makeCustomer())).toBeNull();
    const owner = makeCustomer();
    const back = BankAccountTypeOrmMapper.toDomain(
      BankAccountTypeOrmMapper.toEntity(makeBankAccount(owner, AccountStatus.ACTIVE, 1500)), owner);
    expect(back.identifier.startsWith('acc-')).toBe(true);
    expect(back.currentBalance).toBe(1500);
    expect(back.accountType).toBe(AccountType.SAVINGS);
    expect(back.currency).toBe(Currency.COP);
    expect(back.accountStatus).toBe(AccountStatus.ACTIVE);
  });

  it('Customer: natural y business con representante', () => {
    const nat = makeCustomer();
    const natBack = CustomerTypeOrmMapper.toDomain(CustomerTypeOrmMapper.toEntity(nat));
    expect(natBack.identification).toBe(nat.identification);
    expect(natBack).toBeInstanceOf(NaturalCustomer);

    const biz = makeBusinessCustomer();
    const ent = CustomerTypeOrmMapper.toEntity(biz);
    expect(ent.customerKind).toBe('BUSINESS');
    expect(ent.taxId).toBe(biz.taxIdentificationNumber);
    const rep = new NaturalCustomer('r1', 'rep-1', 'Rep', 'r@x.com', '1', 'a',
      SystemRole.NATURAL_CUSTOMER, CustomerStatus.ACTIVE, NOW, 'rep-1');
    const bizBack = CustomerTypeOrmMapper.toDomain(ent, rep);
    expect(bizBack).toBeInstanceOf(BusinessCustomer);
    expect(() => CustomerTypeOrmMapper.toDomain(ent)).toThrow('representante legal');
  });

  it('User: con y sin cliente asociado', () => {
    const withCustomer = makeUser(SystemRole.NATURAL_CUSTOMER, makeCustomer());
    const e1 = UserTypeOrmMapper.toEntity(withCustomer);
    expect(e1.customerIdentification).toBe(withCustomer.customer?.identification);
    expect(UserTypeOrmMapper.toDomain(e1, withCustomer.customer).username).toBe(withCustomer.username);
    const lone = makeUser(SystemRole.TELLER_EMPLOYEE);
    expect(UserTypeOrmMapper.toEntity(lone).customerIdentification).toBeNull();
    expect(UserTypeOrmMapper.toDomain(UserTypeOrmMapper.toEntity(lone)).role).toBe(SystemRole.TELLER_EMPLOYEE);
  });

  it('Loan: fechas nulas y presentes', () => {
    const applicant = makeCustomer();
    const dest = makeBankAccount(applicant, AccountStatus.ACTIVE, 0);
    const loan = new Loan('L1', applicant, LoanType.PERSONAL, 1000, 0.1, 12, dest);
    const e1 = LoanTypeOrmMapper.toEntity(loan);
    expect(e1.approvalDate).toBeNull();
    expect(e1.disbursementDate).toBeNull();
    loan.approve(1000, NOW);
    const e2 = LoanTypeOrmMapper.toEntity(loan);
    expect(e2.approvalDate).toBe(NOW.toISOString());
    const back = LoanTypeOrmMapper.toDomain(e2, applicant, dest);
    expect(back.loanStatus).toBe(LoanStatus.APPROVED);
    expect(back.approvalDate?.toISOString()).toBe(NOW.toISOString());
    expect(back.disbursementDate).toBeNull();
  });

  it('Transfer: approvedBy nulo y presente', () => {
    const owner = makeCustomer();
    const by = makeUser(SystemRole.NATURAL_CUSTOMER, owner);
    const t = new Transfer('T1', makeBankAccount(owner, AccountStatus.ACTIVE, 1000),
      makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0), 100, NOW, by);
    expect(TransferTypeOrmMapper.toEntity(t).approvedByUsername).toBeNull();
    t.submitForApproval();
    t.approve(by, NOW);
    const e = TransferTypeOrmMapper.toEntity(t);
    expect(e.approvedByUsername).toBe(by.username);
    const back = TransferTypeOrmMapper.toDomain(e,
      t.sourceAccount, t.destinationAccount, by, by);
    expect(back.transferStatus).toBe(TransferStatus.APPROVED);
    expect(back.approvedBy?.username).toBe(by.username);
  });

  it('Operation: mapea identificadores y tipos', () => {
    const user = makeUser();
    const product = makeBankAccount(makeCustomer());
    const op = new Operation('OP-1', OperationType.DEPOSIT, NOW, user, product);
    expect(OperationTypeOrmMapper.toEntity(op)).toMatchObject({
      operationId: 'OP-1', operationType: 'DEPOSIT',
      performedByUsername: user.username, affectedProductIdentifier: product.identifier,
    });
  });

  it('UserStatus y estados inválidos fallan en fromCode', () => {
    expect(() => AccountStatus.fromCode('NOPE')).toThrow();
    expect(UserStatus.fromCode('ACTIVE')).toBe(UserStatus.ACTIVE);
  });
});
