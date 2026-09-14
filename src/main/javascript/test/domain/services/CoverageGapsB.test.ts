import { describe, it, expect, vi } from 'vitest';
import { CustomerService } from '../../../application/domain/services/CustomerService';
import { BankAccountService } from '../../../application/domain/services/BankAccountService';
import { LoanService } from '../../../application/domain/services/LoanService';
import { TransferService } from '../../../application/domain/services/TransferService';
import { UserAuthenticationService } from '../../../application/domain/services/UserAuthenticationService';
import { AuthorizationService } from '../../../application/domain/services/AuthorizationService';
import { Loan } from '../../../application/domain/models/Loan';
import { Transfer } from '../../../application/domain/models/Transfer';
import { LoanType } from '../../../application/domain/valueobjects/LoanType';
import { LoanStatus as LoanStatusVO } from '../../../application/domain/valueobjects/LoanStatus';
import { LoanStatus } from '../../../application/domain/valueobjects/LoanStatus';
import { AccountStatus } from '../../../application/domain/valueobjects/AccountStatus';
import { SystemRole } from '../../../application/domain/valueobjects/SystemRole';
import { UserStatus } from '../../../application/domain/valueobjects/UserStatus';
import {
  LoanNotFoundException,
  InvalidLoanTermException,
  InvalidInterestRateException,
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
describe('Service remaining branches', () => {
  it('throws when an updated or status-changed customer does not exist', async () => {
    const customers = customerRepo();
    const service = new CustomerService(customers, accountRepo(), loanRepo(), authorization());
    const analyst = makeUser(SystemRole.INTERNAL_ANALYST);
    await expect(service.update(analyst, makeCustomer())).rejects.toThrow(CustomerNotFoundException);
    await expect(service.changeStatus(analyst, makeCustomer())).rejects.toThrow(CustomerNotFoundException);
    await expect(service.consultProducts(analyst, makeCustomer())).rejects.toThrow(CustomerNotFoundException);
  });

  it('throws when a consulted account cannot be found in persistence', async () => {
    const accounts = accountRepo();
    (accounts.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (accounts.find as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const service = new BankAccountService(accounts, customerRepo(), operationRepo(), auditRepo(), authorization());
    const acc = makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0);
    await expect(service.consult(makeUser(SystemRole.TELLER_EMPLOYEE), acc)).rejects.toThrow(BankAccountNotFoundException);
  });

  it('validates loan term and interest rate on request', async () => {
    const service = new LoanService(loanRepo(), customerRepo(), accountRepo(), operationRepo(), auditRepo(), authorization());
    const applicant = makeCustomer();
    const badTerm = new Loan('l-1', applicant, LoanType.PERSONAL, 100, 0.1, 0, makeBankAccount(applicant));
    const badRate = new Loan('l-2', applicant, LoanType.PERSONAL, 100, -1, 12, makeBankAccount(applicant));
    await expect(service.requestLoan(makeUser(SystemRole.COMMERCIAL_EMPLOYEE), applicant, badTerm)).rejects.toThrow(InvalidLoanTermException);
    await expect(service.requestLoan(makeUser(SystemRole.COMMERCIAL_EMPLOYEE), applicant, badRate)).rejects.toThrow(InvalidInterestRateException);
  });

  it('blocks unauthorized payment operations and missing loans', async () => {
    const loans = loanRepo();
    const authzPort = authorization();
    (loans.exists as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const service = new LoanService(loans, customerRepo(), accountRepo(), operationRepo(), auditRepo(), authzPort);
    const loan = loanProduct();
    await expect(service.rejectLoan(makeUser(SystemRole.INTERNAL_ANALYST), loan)).rejects.toThrow(LoanNotFoundException);
    await expect(service.registerLoanPayment(makeUser(SystemRole.TELLER_EMPLOYEE), loan)).rejects.toThrow(LoanNotFoundException);
    await expect(service.closeLoan(makeUser(SystemRole.INTERNAL_ANALYST), loan)).rejects.toThrow(LoanNotFoundException);
    await expect(service.disburseLoan(makeUser(SystemRole.TELLER_EMPLOYEE), loan)).rejects.toThrow(LoanNotFoundException);

    (loans.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (authzPort.canExecute as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(service.registerLoanPayment(makeUser(SystemRole.TELLER_EMPLOYEE), loan)).rejects.toThrow(/not authorized to operate this loan/);
  });

  it('rejects transfers missing from persistence and invalid amounts', async () => {
    const transfers = transferRepo();
    (transfers.exists as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const service = new TransferService(transfers, accountRepo(), operationRepo(), auditRepo(), authorization(), configuration());
    const transfer = transferProduct();
    await expect(service.submitForApproval(makeUser(), transfer)).rejects.toThrow(TransferNotFoundException);
    await expect(service.approveTransfer(makeUser(SystemRole.BUSINESS_SUPERVISOR), transfer)).rejects.toThrow(TransferNotFoundException);
    await expect(service.rejectTransfer(makeUser(SystemRole.BUSINESS_SUPERVISOR), transfer)).rejects.toThrow(TransferNotFoundException);
    await expect(service.expireTransfer(makeUser(), transfer)).rejects.toThrow(TransferNotFoundException);
    await expect(service.executeTransfer(makeUser(), transfer)).rejects.toThrow(TransferNotFoundException);

    (transfers.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const fake = { amount: -10 } as unknown as Transfer;
    await expect(service.createTransfer(makeUser(SystemRole.BUSINESS_OPERATOR), fake)).rejects.toThrow(/must be positive/);
  });

  it('prevents duplicated usernames when registering employee users', async () => {
    const users2 = {
      save: vi.fn((u) => u),
      findByUsername: vi.fn(() => null),
      findById: vi.fn(() => null),
      existsByUsername: vi.fn(() => true),
      update: vi.fn(),
    };
    const service = new UserAuthenticationService(users2 as never, passwordService(), jwtService());
    await expect(service.registerEmployeeUser(makeUser(SystemRole.INTERNAL_ANALYST), makeUser(SystemRole.COMMERCIAL_EMPLOYEE)))
      .rejects.toThrow(UserAlreadyExistsException);
  });
});
const authz = new AuthorizationService();

describe('Final uncovered authorization branches', () => {
  it('denies approval checks for users without permission', async () => {
    const blocked = makeUser(SystemRole.INTERNAL_ANALYST, null);
    blocked.changeStatus(UserStatus.BLOCKED);
    expect(authz.canApprove(blocked, loanProduct())).toBe(false);
    expect(authz.canApproveApproval(blocked)).toBe(false);
  });

  it('returns false for products outside the known hierarchy', async () => {
    const unknown = { identifier: 'unknown-x' } as never;
    const ownerUser = makeUser(SystemRole.NATURAL_CUSTOMER, makeCustomer());
    expect(authz.canAccessProduct(ownerUser, unknown)).toBe(false);
    expect(authz.canExecute(makeUser(SystemRole.BUSINESS_OPERATOR), unknown)).toBe(false);
  });
});

describe('Final service guard branches', () => {
  it('prevents activating a closed bank account', async () => {
    const closed = makeBankAccount(makeCustomer(), AccountStatus.CLOSED, 0);
    expect(() => closed.activate()).toThrow('A closed account cannot be activated');
  });

  it('blocks unauthorized deposits on existing accounts', async () => {
    const accounts = accountRepo();
    (accounts.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const authzPort = authorization({ canExecute: () => false });
    const service = new BankAccountService(accounts, customerRepo(), operationRepo(), auditRepo(), authzPort);
    const acc = makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 10);
    await expect(service.deposit(makeUser(SystemRole.TELLER_EMPLOYEE), acc, 5)).rejects.toThrow(/not authorized to operate this account/);
  });

  it('blocks unauthorized disbursement and closing of loans', async () => {
    const loans = loanRepo();
    (loans.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const noExecutePort = authorization({ canExecute: () => false });
    const noApprovePort = authorization({ canApprove: () => false });
    const denyService = new LoanService(loans, customerRepo(), accountRepo(), operationRepo(), auditRepo(), noExecutePort);
    const closeDenyService = new LoanService(loans, customerRepo(), accountRepo(), operationRepo(), auditRepo(), noApprovePort);
    const approved = loanProduct();
    approved.approve(500, NOW);
    await expect(denyService.disburseLoan(makeUser(SystemRole.TELLER_EMPLOYEE), approved)).rejects.toThrow(/not authorized to disburse this loan/);
    await expect(closeDenyService.closeLoan(makeUser(SystemRole.COMMERCIAL_EMPLOYEE), loanProduct())).rejects.toThrow(/not authorized to close loans/);
  });
  it('blocks unauthorized execution and consultation of transfers', async () => {
    const transfers = transferRepo();
    (transfers.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const authzPort = authorization({ canExecute: () => false });
    const service = new TransferService(transfers, accountRepo(), operationRepo(), auditRepo(), authzPort, configuration());
    const transfer = transferProduct();
    await expect(service.executeTransfer(makeUser(), transfer)).rejects.toThrow(/not authorized to execute this transfer/);
    await expect(service.consultTransfer(makeUser(), transfer)).rejects.toThrow(/not authorized to consult this transfer/);
  });
});
describe('Last uncovered branches', () => {
  it('denies authorization for users without an active status', async () => {
    const blocked = makeUser(SystemRole.TELLER_EMPLOYEE);
    blocked.changeStatus(UserStatus.BLOCKED);
    expect(authz.hasPermission(blocked)).toBe(false);
    expect(authz.canAccessCustomer(blocked, makeCustomer())).toBe(false);
    expect(authz.canAccessProduct(blocked, makeBankAccount(makeCustomer()))).toBe(false);
    expect(authz.canExecute(blocked, makeBankAccount(makeCustomer()))).toBe(false);
    expect(authz.canApprove(blocked, loanProduct())).toBe(false);
    expect(authz.canApproveApproval(blocked)).toBe(false);
  });

  it('blocks loan requests from unauthorized users', async () => {
    const loans = loanRepo();
    (loans.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const denyPort = authorization({ canExecute: () => false });
    const customers = customerRepo();
    (customers.findByIdentification as ReturnType<typeof vi.fn>).mockImplementation((applicant) => applicant);
    const service = new LoanService(loans, customers, accountRepo(), operationRepo(), auditRepo(), denyPort);
    const requestedLoan = loanProduct();
    await expect(service.requestLoan(
      makeUser(SystemRole.NATURAL_CUSTOMER, requestedLoan.applicant),
      requestedLoan.applicant,
      requestedLoan
    )).rejects.toThrow(/not authorized to request this loan/);
  });
});