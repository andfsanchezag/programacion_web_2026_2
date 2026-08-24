import { DomainException } from './DomainException';

/**
 * Bank account management exceptions.
 */

export class BankAccountNotFoundException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidBankAccountException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidAccountStatusException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidAccountStatusTransitionException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidAccountOwnershipException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InsufficientBalanceException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidDepositException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidWithdrawalException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class AccountAlreadyClosedException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class AccountAlreadyBlockedException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class CustomerNotEligibleException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}