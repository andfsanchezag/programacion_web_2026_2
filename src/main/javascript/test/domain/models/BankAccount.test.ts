import { describe, it, expect } from 'vitest';
import {
  BankAccount,
} from '../../../application/domain/models/BankAccount';
import {
  InvalidBankAccountException,
  InsufficientBalanceException,
  InvalidDepositException,
  InvalidWithdrawalException,
  AccountAlreadyClosedException,
  AccountAlreadyBlockedException,
  InvalidAccountStatusTransitionException,
} from '../../../application/domain/exceptions/bank-account-errors';
import { AccountStatus } from '../../../application/domain/valueobjects/AccountStatus';
import { Currency } from '../../../application/domain/valueobjects/Currency';
import { AccountType } from '../../../application/domain/valueobjects/AccountType';
import { NOW, makeCustomer, makeNaturalCustomer } from '../../helpers';

function make(status: AccountStatus = AccountStatus.PENDING_ACTIVATION, balance = 0): BankAccount {
  return new BankAccount('acc-1', AccountType.SAVINGS, makeCustomer(), Currency.COP, NOW, balance, status);
}

describe('BankAccount', () => {
  it('exposes attributes', () => {
    const owner = makeCustomer();
    const acc = new BankAccount('acc-9', AccountType.CHECKING, owner, Currency.USD, NOW, 100, AccountStatus.ACTIVE);
    expect(acc.identifier).toBe('acc-9');
    expect(acc.accountType).toBe(AccountType.CHECKING);
    expect(acc.owner).toBe(owner);
    expect(acc.currency).toBe(Currency.USD);
    expect(acc.openingDate).toBe(NOW);
    expect(acc.currentBalance).toBe(100);
    expect(acc.accountStatus).toBe(AccountStatus.ACTIVE);
  });

  it('rejects missing owner and empty identifier', () => {
    expect(() => new BankAccount('', AccountType.SAVINGS, makeCustomer(), Currency.COP, NOW)).toThrow(Error);
    expect(() => new BankAccount('a', AccountType.SAVINGS, undefined as never, Currency.COP, NOW)).toThrow(InvalidBankAccountException);
  });

  it('activates a pending account', () => {
    const acc = make();
    acc.activate();
    expect(acc.accountStatus).toBe(AccountStatus.ACTIVE);
  });

  it('blocks and unblocks accounts', () => {
    const acc = make(AccountStatus.ACTIVE);
    acc.block();
    expect(acc.accountStatus).toBe(AccountStatus.BLOCKED);
    acc.unblock();
    expect(acc.accountStatus).toBe(AccountStatus.ACTIVE);
  });

  it('prevents invalid block/unblock transitions', () => {
    const blocked = make(AccountStatus.BLOCKED);
    expect(() => blocked.block()).toThrow(AccountAlreadyBlockedException);
    const closed = make(AccountStatus.CLOSED);
    expect(() => closed.block()).toThrow(InvalidAccountStatusTransitionException);
    expect(() => closed.unblock()).toThrow(InvalidAccountStatusTransitionException);
  });

  it('closes an account without balance', () => {
    const acc = make(AccountStatus.ACTIVE, 0);
    acc.close();
    expect(acc.accountStatus).toBe(AccountStatus.CLOSED);
  });

  it('prevents closing twice or with balance', () => {
    const funded = make(AccountStatus.ACTIVE, 50);
    expect(() => funded.close()).toThrow(InvalidAccountStatusTransitionException);
    const acc = make(AccountStatus.ACTIVE, 0);
    acc.close();
    expect(() => acc.close()).toThrow(AccountAlreadyClosedException);
  });

  it('deposits funds on active account', () => {
    const acc = make(AccountStatus.ACTIVE, 10);
    acc.deposit(90);
    expect(acc.currentBalance).toBe(100);
  });

  it('withdraws funds respecting the balance', () => {
    const acc = make(AccountStatus.ACTIVE, 100);
    acc.withdraw(40);
    expect(acc.currentBalance).toBe(60);
  });

  it('rejects deposits on non-operational accounts', () => {
    const acc = make(AccountStatus.PENDING_ACTIVATION);
    expect(() => acc.deposit(1)).toThrow(InvalidAccountStatusTransitionException);
    const blocked = make(AccountStatus.BLOCKED);
    expect(() => blocked.deposit(1)).toThrow(InvalidAccountStatusTransitionException);
  });

  it('rejects invalid deposit amounts', () => {
    const acc = make(AccountStatus.ACTIVE);
    expect(() => acc.deposit(0)).toThrow(InvalidDepositException);
    expect(() => acc.deposit(-5)).toThrow(InvalidDepositException);
  });

  it('rejects withdrawals over the balance or invalid amounts', () => {
    const acc = make(AccountStatus.ACTIVE, 10);
    expect(() => acc.withdraw(11)).toThrow(InsufficientBalanceException);
    expect(() => acc.withdraw(0)).toThrow(InvalidWithdrawalException);
    expect(() => acc.withdraw(-1)).toThrow(InvalidWithdrawalException);
  });

  it('transfers in and out using domain behavior', () => {
    const source = make(AccountStatus.ACTIVE, 200);
    const target = make(AccountStatus.ACTIVE, 0);
    source.transferOut(150);
    target.transferIn(150);
    expect(source.currentBalance).toBe(50);
    expect(target.currentBalance).toBe(150);
  });
});