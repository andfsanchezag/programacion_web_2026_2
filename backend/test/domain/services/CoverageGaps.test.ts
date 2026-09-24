import { describe, it, expect, vi } from 'vitest';
import { AuthorizationService } from '../../../src/application/domain/services/AuthorizationService';
import { CustomerService } from '../../../src/application/domain/services/CustomerService';
import { BankAccountService } from '../../../src/application/domain/services/BankAccountService';
import { LoanService } from '../../../src/application/domain/services/LoanService';
import { TransferService } from '../../../src/application/domain/services/TransferService';
import { UserAuthenticationService } from '../../../src/application/domain/services/UserAuthenticationService';
import { Loan } from '../../../src/application/domain/models/Loan';
import { Transfer } from '../../../src/application/domain/models/Transfer';
import { LoanStatus } from '../../../src/application/domain/valueobjects/LoanStatus';
import { LoanType } from '../../../src/application/domain/valueobjects/LoanType';
import { AccountStatus } from '../../../src/application/domain/valueobjects/AccountStatus';
import { SystemRole } from '../../../src/application/domain/valueobjects/SystemRole';
import {
  LoanNotFoundException,
  InvalidLoanTermException,
  InvalidLoanAmountException,
} from '../../../src/application/domain/exceptions/loan-errors';
import { TransferNotFoundException } from '../../../src/application/domain/exceptions/transfer-errors';
import { BankAccountNotFoundException } from '../../../src/application/domain/exceptions/bank-account-errors';
import { CustomerNotFoundException } from '../../../src/application/domain/exceptions/customer-errors';
import { UserAlreadyExistsException } from '../../../src/application/domain/exceptions/user-errors';
import { makeCustomer, makeUser, makeBankAccount, NOW } from '../../helpers';
import {
  customerRepo, accountRepo, loanRepo, transferRepo,
  operationRepo, auditRepo, authorization, passwordService, jwtService, configuration,
} from './mocks';

const authz = new AuthorizationService();

function loanProduct(ownerCustomer = makeCustomer()): Loan {
  return new Loan(
    'loan-auth', ownerCustomer, LoanType.PERSONAL, 1000, 0.1, 12,
    makeBankAccount(ownerCustomer, AccountStatus.ACTIVE, 0), 0, LoanStatus.UNDER_REVIEW, null, null
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
  it('validates permissions by user status', async () => {
    expect(authz.hasPermission(makeUser())).toBe(true);
    expect(authz.hasPermission(null as never)).toBe(false);
    expect(authz.hasPermission(undefined as never)).toBe(false);
  });

  it('grants customer access to employees and owners only', async () => {
    const customer = makeCustomer();
    expect(authz.canAccessCustomer(makeUser(SystemRole.TELLER_EMPLOYEE), customer)).toBe(true);
    expect(authz.canAccessCustomer(makeUser(SystemRole.NATURAL_CUSTOMER, customer), customer)).toBe(true);
    expect(authz.canAccessCustomer(makeUser(SystemRole.BUSINESS_OPERATOR), customer)).toBe(false);
    expect(authz.canAccessCustomer(makeUser(SystemRole.INTERNAL_ANALYST), customer)).toBe(true);
  });

  it('controls product access for accounts', async () => {
    const account = makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0);
    expect(authz.canAccessProduct(makeUser(SystemRole.COMMERCIAL_EMPLOYEE), account)).toBe(true);
    expect(authz.canAccessProduct(makeUser(SystemRole.NATURAL_CUSTOMER, account.owner), account)).toBe(true);
    expect(authz.canAccessProduct(makeUser(SystemRole.NATURAL_CUSTOMER), account)).toBe(false);
    expect(authz.canAccessProduct(undefined as never, account)).toBe(false);
  });

  it('evaluates execution rights per product type', async () => {
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

  it('allows supervisors and analysts to operate supervised transfers (SDD 7.x)', async () => {
    const supervisor = makeUser(SystemRole.BUSINESS_SUPERVISOR);
    const analyst = makeUser(SystemRole.INTERNAL_ANALYST);
    const stranger = makeUser(SystemRole.NATURAL_CUSTOMER);
    const transfer = transferProduct();
    expect(authz.canExecute(supervisor, transfer)).toBe(true);
    expect(authz.canExecute(analyst, transfer)).toBe(true);
    expect(authz.canExecute(stranger, transfer)).toBe(false);
  });

  it('restricts approval authority by product and role', async () => {
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

  it('allows commercial employees to request loans on behalf of customers (SDD 9.1)', async () => {
    const commercial = makeUser(SystemRole.COMMERCIAL_EMPLOYEE);
    expect(authz.canExecute(commercial, loanProduct())).toBe(true);
  });

  it('allows the business customer to approve company transfers (SDD 5.3/5.4)', async () => {
    const business = makeUser(SystemRole.BUSINESS_CUSTOMER);
    expect(authz.canApprove(business, transferProduct())).toBe(true);
  });

  it('User.customer setter reasigna el cliente asociado', async () => {
    const user = makeUser(SystemRole.NATURAL_CUSTOMER, makeCustomer());
    const other = makeCustomer();
    user.customer = other;
    expect(user.customer?.identification).toBe(other.identification);
    user.customer = null;
    expect(user.customer).toBeNull();
  });
});