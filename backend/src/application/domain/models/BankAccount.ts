import { BankingProduct } from './BankingProduct';
import { Customer } from './Customer';
import { AccountType } from '../valueobjects/AccountType';
import { Currency } from '../valueobjects/Currency';
import { AccountStatus } from '../valueobjects/AccountStatus';
import {
  InvalidBankAccountException,
  InvalidAccountStatusTransitionException,
  InsufficientBalanceException,
  InvalidDepositException,
  InvalidWithdrawalException,
  AccountAlreadyClosedException,
  AccountAlreadyBlockedException,
} from '../exceptions/bank-account-errors';

/**
 * BankAccount - A banking product owned by a customer.
 */
export class BankAccount extends BankingProduct {
  private readonly _accountType: AccountType;
  private readonly _owner: Customer;
  private _currentBalance: number;
  private readonly _currency: Currency;
  private _accountStatus: AccountStatus;
  private readonly _openingDate: Date;

  constructor(
    identifier: string,
    accountType: AccountType,
    owner: Customer,
    currency: Currency,
    openingDate: Date,
    currentBalance: number = 0,
    accountStatus: AccountStatus = AccountStatus.PENDING_ACTIVATION
  ) {
    super(identifier);
    if (owner === null || owner === undefined) {
      throw new InvalidBankAccountException('Bank account owner must be provided');
    }
    this._accountType = accountType;
    this._owner = owner;
    this._currency = currency;
    this._openingDate = openingDate;
    this._currentBalance = currentBalance;
    this._accountStatus = accountStatus;
  }

  get accountType(): AccountType {
    return this._accountType;
  }

  get owner(): Customer {
    return this._owner;
  }

  get currentBalance(): number {
    return this._currentBalance;
  }

  get currency(): Currency {
    return this._currency;
  }

  get accountStatus(): AccountStatus {
    return this._accountStatus;
  }

  get openingDate(): Date {
    return this._openingDate;
  }

  activate(): void {
    if (this._accountStatus.equals(AccountStatus.CLOSED)) {
      throw new InvalidAccountStatusTransitionException('A closed account cannot be activated');
    }
    this._accountStatus = AccountStatus.ACTIVE;
  }

  block(): void {
    if (this._accountStatus.equals(AccountStatus.BLOCKED)) {
      throw new AccountAlreadyBlockedException('Account is already blocked');
    }
    if (this._accountStatus.equals(AccountStatus.CLOSED)) {
      throw new InvalidAccountStatusTransitionException('A closed account cannot be blocked');
    }
    this._accountStatus = AccountStatus.BLOCKED;
  }

  unblock(): void {
    if (this._accountStatus.equals(AccountStatus.CLOSED)) {
      throw new InvalidAccountStatusTransitionException('A closed account cannot be unblocked');
    }
    this._accountStatus = AccountStatus.ACTIVE;
  }

  close(): void {
    if (this._accountStatus.equals(AccountStatus.CLOSED)) {
      throw new AccountAlreadyClosedException('Account is already closed');
    }
    if (this._currentBalance > 0) {
      throw new InvalidAccountStatusTransitionException('An account with balance cannot be closed');
    }
    this._accountStatus = AccountStatus.CLOSED;
  }

  deposit(amount: number): void {
    this.assertOperational();
    if (amount === null || amount === undefined || amount <= 0) {
      throw new InvalidDepositException('Deposit amount must be positive');
    }
    this._currentBalance += amount;
  }

  withdraw(amount: number): void {
    this.assertOperational();
    if (amount === null || amount === undefined || amount <= 0) {
      throw new InvalidWithdrawalException('Withdrawal amount must be positive');
    }
    if (amount > this._currentBalance) {
      throw new InsufficientBalanceException('Insufficient balance for withdrawal');
    }
    this._currentBalance -= amount;
  }

  transferOut(amount: number): void {
    this.withdraw(amount);
  }

  transferIn(amount: number): void {
    this.deposit(amount);
  }

  private assertOperational(): void {
    if (!this._accountStatus.isOperational()) {
      throw new InvalidAccountStatusTransitionException('Account must be active to operate');
    }
  }
}
