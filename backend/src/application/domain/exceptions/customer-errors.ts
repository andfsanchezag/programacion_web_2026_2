import { DomainException } from './DomainException';

/**
 * Customer management exceptions.
 */

export class CustomerAlreadyExistsException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class CustomerNotFoundException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidCustomerException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidCustomerStatusException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidLegalRepresentativeException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class UnauthorizedCustomerOperationException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidCustomerStatusTransitionException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}