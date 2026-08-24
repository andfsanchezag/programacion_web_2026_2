import { DomainException } from './DomainException';

/**
 * Transfer management exceptions.
 */

export class TransferNotFoundException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidTransferException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidTransferStatusException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidTransferStatusTransitionException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class TransferAlreadyApprovedException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class TransferAlreadyRejectedException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class TransferAlreadyExecutedException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class TransferAlreadyExpiredException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class TransferNotApprovedException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidTransferAmountException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class SameAccountTransferException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}