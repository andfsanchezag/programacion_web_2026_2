import { DomainException } from './DomainException';

/**
 * Loan management exceptions.
 */

export class LoanNotFoundException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidLoanException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidLoanStatusException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidLoanStatusTransitionException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class LoanAlreadyApprovedException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class LoanAlreadyRejectedException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class LoanAlreadyDisbursedException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class LoanAlreadyClosedException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidLoanAmountException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidLoanTermException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidApprovedAmountException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidInterestRateException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidDestinationAccountException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class LoanDisbursementException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}
export class CustomerNotEligibleException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}