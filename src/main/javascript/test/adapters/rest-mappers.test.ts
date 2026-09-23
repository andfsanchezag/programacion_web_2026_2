import { describe, it, expect } from 'vitest';
import {
  AuthRestMapper, BankAccountRestMapper, LoanRestMapper, TransferRestMapper,
  OperationRestMapper,
} from '../../application/adapters/rest/mappers/rest.mappers';
import { TransferStatus } from '../../application/domain/valueobjects/TransferStatus';
import { AccountStatus } from '../../application/domain/valueobjects/AccountStatus';
import { LoanType } from '../../application/domain/valueobjects/LoanType';
import { LoanStatus } from '../../application/domain/valueobjects/LoanStatus';
import { OperationType } from '../../application/domain/valueobjects/OperationType';
import { SystemRole } from '../../application/domain/valueobjects/SystemRole';
import { Transfer } from '../../application/domain/models/Transfer';
import { Loan } from '../../application/domain/models/Loan';
import { Operation } from '../../application/domain/models/Operation';
import { AuditLog } from '../../application/domain/models/AuditLog';
import { makeCustomer, makeNaturalCustomer, makeBusinessCustomer, makeUser, makeBankAccount, NOW } from '../helpers';

describe('REST mappers (DTO ↔ dominio)', () => {
  it('Auth: login, password, respuestas de usuario y clientes', () => {
    const login = AuthRestMapper.loginToDomain({ username: 'u1', password: 'pw' });
    expect(login.username).toBe('u1');
    expect(login.passwordHash).toBe('pw');
    expect(AuthRestMapper.withPassword(login, 'x')).toEqual({ username: 'u1', password: 'x' });

    const user = makeUser(SystemRole.NATURAL_CUSTOMER, makeCustomer());
    expect(AuthRestMapper.toLoginResponse(user, 'tok', 3600)).toMatchObject({
      token: 'tok', tokenType: 'Bearer', expiresIn: 3600,
      user: { username: user.username, role: 'NATURAL_CUSTOMER' },
    });
    expect(AuthRestMapper.toUserResponse(user)).toMatchObject({
      username: user.username, role: user.role.code, status: user.status.code,
    });

    const nat = AuthRestMapper.naturalCustomerToDomain({
      identification: '1017', name: 'N', email: 'n@x.com',
      phoneNumber: '1', address: 'a', birthDate: '2000-01-01',
    });
    expect(AuthRestMapper.toCustomerResponse(nat)).toMatchObject({
      identification: '1017', customerType: 'NATURAL',
    });
    const rep = makeNaturalCustomer();
    const biz = AuthRestMapper.businessCustomerToDomain({
      identification: '9001', name: 'B', email: 'b@x.com',
      phoneNumber: '2', address: 'b', legalRepresentativeIdentification: rep.identification,
    }, rep);
    const bizRes = AuthRestMapper.toCustomerResponse(biz);
    expect(bizRes.customerType).toBe('BUSINESS');
    expect(bizRes.legalRepresentative?.identification).toBe(rep.identification);
    expect(AuthRestMapper.toCustomerResponse(makeBusinessCustomer()).customerType).toBe('BUSINESS');
  });

  it('Auth: userToDomain con y sin cliente', () => {
    const customer = makeCustomer();
    const u = AuthRestMapper.userToDomain(
      { customerIdentification: customer.identification, username: 'op1', password: 'pw', role: 'BUSINESS_OPERATOR' },
      customer);
    expect(u.userId).toBe('usr-op1');
    expect(u.role).toBe(SystemRole.BUSINESS_OPERATOR);
    expect(u.customer?.identification).toBe(customer.identification);
    expect(AuthRestMapper.userToDomain(
      { customerIdentification: 'x', username: 'e1', password: 'pw', role: 'TELLER_EMPLOYEE' }, null
    ).customer).toBeNull();
  });

  it('BankAccount: respuestas y apertura desde DTO', () => {
    const owner = makeCustomer();
    const acc = makeBankAccount(owner, AccountStatus.ACTIVE, 750);
    expect(BankAccountRestMapper.toResponse(acc)).toMatchObject({
      accountNumber: acc.identifier, availableBalance: 750, currency: 'COP', status: 'ACTIVE',
    });
    expect(BankAccountRestMapper.toBalanceResponse(acc)).toMatchObject({ availableBalance: 750 });
    const opened = BankAccountRestMapper.openToDomain('CTA-9', 'SAVINGS', owner, 'COP');
    expect(opened.identifier).toBe('CTA-9');
    expect(opened.accountStatus).toBe(AccountStatus.ACTIVE);
  });

  it('Loan: request y response', () => {
    const applicant = makeCustomer();
    const dest = makeBankAccount(applicant, AccountStatus.ACTIVE, 0);
    const loan = LoanRestMapper.requestToDomain(
      { loanType: 'PERSONAL', requestedAmount: 1000, termInMonths: 6, destinationAccountNumber: dest.identifier },
      applicant, dest, 'LN-9');
    expect(loan.identifier).toBe('LN-9');
    expect(loan.loanStatus).toBe(LoanStatus.UNDER_REVIEW);
    expect(LoanRestMapper.toResponse(loan)).toMatchObject({
      loanId: 'LN-9', loanType: 'PERSONAL', requestedAmount: 1000, termInMonths: 6,
    });
  });

  it('Transfer: create y response con/sin executedAt', () => {
    const owner = makeCustomer();
    const src = makeBankAccount(owner, AccountStatus.ACTIVE, 1000);
    const dst = makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0);
    const by = makeUser(SystemRole.NATURAL_CUSTOMER, owner);
    const t = TransferRestMapper.createToDomain(
      { sourceAccountNumber: src.identifier, destinationAccountNumber: dst.identifier, amount: 100 },
      src, dst, by, 'TR-9');
    expect(t.transferStatus).toBe(TransferStatus.PENDING);
    const pending = TransferRestMapper.toResponse(t);
    expect(pending.status).toBe('PENDING');
    expect(pending.executedAt).toBeUndefined();
    t.submitForApproval();
    t.approve(by, NOW);
    src.transferOut(100);
    dst.transferIn(100);
    t.markExecuted();
    const done = TransferRestMapper.toResponse(t);
    expect(done.status).toBe('EXECUTED');
    expect(typeof done.executedAt).toBe('string');
  });

  it('Operation y AuditLog: respuestas con detalles', () => {
    const user = makeUser();
    const product = makeBankAccount(makeCustomer());
    const op = new Operation('OP-7', OperationType.WITHDRAWAL, NOW, user, product);
    expect(OperationRestMapper.toResponse(op)).toMatchObject({
      operationId: 'OP-7', operationType: 'WITHDRAWAL', performedBy: user.username,
    });
    const audit = new AuditLog('AU-7', OperationType.WITHDRAWAL, NOW, user, product,
      new Map<string, unknown>([['amount', 300], ['ok', true]]));
    const res = OperationRestMapper.auditToResponse(audit);
    expect(res).toMatchObject({ auditId: 'AU-7', userRole: user.role.code, details: { amount: 300, ok: true } });
    expect(LoanType.fromCode('PERSONAL')).toBe(LoanType.PERSONAL);
  });
});
