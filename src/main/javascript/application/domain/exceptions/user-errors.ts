import { DomainException } from './DomainException';

/**
 * User and authentication exceptions.
 */

export class UserAlreadyExistsException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class UserNotFoundException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidUserException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidUserStatusException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidUserStatusTransitionException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidCredentialsException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidCredentialsActiveException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class UnauthorizedUserOperationException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class SessionNotFoundException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}
export class UserNotActiveException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}