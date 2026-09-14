import { describe, it, expect, vi } from 'vitest';
import { BankAccountService } from '../../../application/domain/services/BankAccountService';
import {
  BankAccountNotFoundException,
  CustomerNotEligibleException,
} from '../../../application/domain/exceptions/bank-account-errors';
import { UnauthorizedCustomerOperationException } from '../../../application/domain/exceptions/customer-errors';
import { AccountStatus } from '../../../application/domain/valueobjects/AccountStatus';
import { makeCustomer, makeUser, makeBankAccount, NOW } from '../../helpers';
import { customerRepo, accountRepo, operationRepo, auditRepo, authorization } from '../services/mocks';
import { SystemRole } from '../../../application/domain/valueobjects/SystemRole';

function build() {
  const accounts = accountRepo();
  const customers = customerRepo();
  (customers.findByIdentification as ReturnType<typeof vi.fn>).mockImplementation((owner) => owner);
  const operations = operationRepo();
  const audits = auditRepo();
  const authz = authorization();
  const service = new BankAccountService(accounts, customers, operations, audits, authz);
  return { service, accounts, customers, operations, audits, authz };
}

  describe('BankAccountService', () => {
  it('opens an account for an eligible customer', async () => {
    const { service, accounts, operations, audits } = build();
    const owner = makeCustomer();
    const account = makeBankAccount(owner, AccountStatus.PENDING_ACTIVATION, 0);
    const saved = await service.openAccount(makeUser(SystemRole.TELLER_EMPLOYEE), account);
    expect(saved.accountStatus).toBe(AccountStatus.ACTIVE);
    expect(accounts.save).toHaveBeenCalledWith(account);
    expect(operations.save).toHaveBeenCalled();
    expect(audits.save).toHaveBeenCalled();
  });

  it('rejects accounts for non-operational owners and unauthorized users', async () => {
    const { service, customers, authz } = build();
    const blockedOwner = makeCustomer();
    blockedOwner.block();
    (customers.findByIdentification as ReturnType<typeof vi.fn>).mockReturnValue(blockedOwner);
    await expect(service.openAccount(makeUser(), makeBankAccount(blockedOwner))).rejects.toThrow(CustomerNotEligibleException);

    (customers.findByIdentification as ReturnType<typeof vi.fn>).mockReturnValue(null);
    await expect(service.openAccount(makeUser(), makeBankAccount(makeCustomer()))).rejects.toThrow(CustomerNotEligibleException);

    (customers.findByIdentification as ReturnType<typeof vi.fn>).mockImplementation((owner) => owner);
    (authz.canExecute as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(service.openAccount(makeUser(), makeBankAccount(makeCustomer()))).rejects.toThrow(UnauthorizedCustomerOperationException);
  });

  it('consults an existing account and its balance', async () => {
    const { service, accounts } = build();
    const acc = makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 250);
    (accounts.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (accounts.find as ReturnType<typeof vi.fn>).mockReturnValue(acc);
    expect(await service.consult(makeUser(SystemRole.TELLER_EMPLOYEE), acc)).toBe(acc);
    expect(await service.consultBalance(makeUser(SystemRole.TELLER_EMPLOYEE), acc)).toBe(250);
  });

  it('throws when the consulted account does not exist', async () => {
    const { service, accounts } = build();
    (accounts.exists as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(service.consult(makeUser(), makeBankAccount(makeCustomer()))).rejects.toThrow(BankAccountNotFoundException);
  });

  it('deposits funds recording the business operation', async () => {
    const { service, accounts, operations } = build();
    const acc = makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0);
    (accounts.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    await service.deposit(makeUser(SystemRole.TELLER_EMPLOYEE), acc, 500);
    expect(acc.currentBalance).toBe(500);
    expect(accounts.update).toHaveBeenCalledWith(acc);
    expect(operations.save).toHaveBeenCalled();
  });

  it('withdraws funds recording the business operation', async () => {
    const { service, accounts } = build();
    (accounts.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const acc = makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 300);
    await service.withdraw(makeUser(SystemRole.TELLER_EMPLOYEE), acc, 100);
    expect(acc.currentBalance).toBe(200);
  });

  it('blocks, unblocks and closes accounts with authorization', async () => {
    const { service } = build();
    const acc = makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0);
    await service.block(makeUser(SystemRole.TELLER_EMPLOYEE), acc);
    expect(acc.accountStatus).toBe(AccountStatus.BLOCKED);
    await service.unblock(makeUser(SystemRole.TELLER_EMPLOYEE), acc);
    expect(acc.accountStatus).toBe(AccountStatus.ACTIVE);
    await service.close(makeUser(SystemRole.TELLER_EMPLOYEE), acc);
    expect(acc.accountStatus).toBe(AccountStatus.CLOSED);
  });

  it('prevents unauthorized management of accounts', async () => {
    const { service, authz } = build();
    (authz.canExecute as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const acc = makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0);
    await expect(service.deposit(makeUser(), acc, 1)).rejects.toThrow(Error);
    await expect(service.withdraw(makeUser(), acc, 1)).rejects.toThrow(Error);
    await expect(service.block(makeUser(), acc)).rejects.toThrow(Error);
    await expect(service.unblock(makeUser(), acc)).rejects.toThrow(Error);
    await expect(service.close(makeUser(), acc)).rejects.toThrow(Error);
  });
});