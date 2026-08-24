import { describe, it, expect, vi } from 'vitest';
import { AuthorizationService } from '../../../application/domain/services/AuthorizationService';
import { CustomerService } from '../../../application/domain/services/CustomerService';
import { BankAccountService } from '../../../application/domain/services/BankAccountService';
import { LoanService } from '../../../application/domain/services/LoanService';
import { TransferService } from '../../../application/domain/services/TransferService';
import { UserAuthenticationService } from '../../../application/domain/services/UserAuthenticationService';
import { Loan } from '../../../application/domain/models/Loan';
import { Transfer } from '../../../application/domain/models/Transfer';
import { LoanStatus } from '../../../application/domain/valueobjects/LoanStatus';
import { LoanType } from '../../../application/domain/valueobjects/LoanType';
import { AccountStatus } from '../../../application/domain/valueobjects/AccountStatus';
import { SystemRole } from '../../../application/domain/valueobjects/SystemRole';
import {
  LoanNotFoundException,
  InvalidLoanTermException,
  InvalidLoanAmountException,
} from '../../../application/domain/exceptions/loan-errors';
import { TransferNotFoundException } from '../../../application/domain/exceptions/transfer-errors';
import { BankAccountNotFoundException } from '../../../application/domain/exceptions/bank-account-errors';
import { CustomerNotFoundException } from '../../../application/domain/exceptions/customer-errors';
import { UserAlreadyExistsException } from '../../../application/domain/exceptions/user-errors';
import { makeCustomer, makeUser, makeBankAccount, NOW } from '../../helpers';
import {
  customerRepo, accountRepo, loanRepo, transferRepo,
  operationRepo, auditRepo, authorization, passwordService, jwtService, configuration,
} from './mocks';

const authz = new AuthorizationService();

function loanProduct(ownerCustomer = makeCustomer()): Loan {
  return new Loan(
    'loan-auth', ownerCustomer, LoanType.PERSONAL, 1000, 0.1, 12,
    makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0), 0, LoanStatus.UNDER_REVIEW, null, null
  );
}

function transferProduct(): Transfer {
  const owner = makeCustomer();
  return new Transfer(
    'tr-auth',
    makeBankAccount(owner, AccountStatus.ACTIVE, 100),
    makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0),
    50, NOW, makeUser(SystemRole.NATURAL_CUSTOMER, owner)
  );
}

describe('AuthorizationService full branch coverage', () => {
  it('validates permissions by user status', () => {
    expect(authz.hasPermission(makeUser())).toBe(true);
    expect(authz.hasPermission(null as never)).toBe(false);
    expect(authz.hasPermission(undefined as never)).toBe(false);
  });

  it('grants customer access to employees and owners only', () => {
    const customer = makeCustomer();
    expect(authz.canAccessCustomer(makeUser(SystemRole.TELLER_EMPLOYEE), customer)).toBe(true);
    expect(authz.canAccessCustomer(makeUser(SystemRole.NATURAL_CUSTOMER, customer), customer)).toBe(true);
    expect(authz.canAccessCustomer(makeUser(SystemRole.BUSINESS_OPERATOR), customer)).toBe(false);
    expect(authz.canAccessCustomer(makeUser(SystemRole.INTERNAL_ANALYST), customer)).toBe(true);
  });

  it('controls product access for accounts', () => {
    const account = makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0);
    expect(authz.canAccessProduct(makeUser(SystemRole.COMMERCIAL_EMPLOYEE), account)).toBe(true);
    expect(authz.canAccessProduct(makeUser(SystemRole.NATURAL_CUSTOMER, account.owner), account)).toBe(true);
    expect(authz.canAccessProduct(makeUser(SystemRole.NATURAL_CUSTOMER), account)).toBe(false);
    expect(authz.canAccessProduct(undefined as never, account)).toBe(false);
  });

  it('evaluates execution rights per product type', () => {
    const account = makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0);
    const operator = makeUser(SystemRole.BUSINESS_OPERATOR);
    const teller = makeUser(SystemRole.TELLER_EMPLOYEE);
    const stranger = makeUser(SystemRole.NATURAL_CUSTOMER);
    const ownerUser = makeUser(SystemRole.NATURAL_CUSTOMER, account.owner);

    expect(authz.canExecute(teller, account)).toBe(true);
    expect(authz.canExecute(ownerUser, account)).toBe(true);
    expect(authz.canExecute(stranger, account)).toBe(false);

    const loan = loanProduct(account.owner);
    expect(authz.canExecute(operator, loan)).toBe(true);
    expect(authz.canExecute(makeUser(SystemRole.NATURAL_CUSTOMER, account.owner), loan)).toBe(true);
    expect(authz.canExecute(stranger, loan)).toBe(false);

    const transfer = transferProduct();
    expect(authz.canExecute(operator, transfer)).toBe(true);
    expect(authz.canExecute(makeUser(SystemRole.NATURAL_CUSTOMER, transfer.sourceAccount.owner), transfer)).toBe(true);
  });

  it('restricts approval authority by product and role', () => {
    const analyst = makeUser(SystemRole.INTERNAL_ANALYST);
    const supervisor = makeUser(SystemRole.BUSINESS_SUPERVISOR);
    const natural = makeUser(SystemRole.NATURAL_CUSTOMER);
    const account = makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0);

    expect(authz.canApprove(analyst, loanProduct())).toBe(true);
    expect(authz.canApprove(supervisor, loanProduct())).toBe(false);
    expect(authz.canApprove(natural, loanProduct())).toBe(false);

    expect(authz.canApprove(supervisor, transferProduct())).toBe(true);
    expect(authz.canApprove(analyst, transferProduct())).toBe(true);
    expect(authz.canApprove(natural, transferProduct())).toBe(false);

    expect(authz.canApprove(analyst, account)).toBe(false);
    expect(authz.canApproveApproval(natural)).toBe(false);
  });
});