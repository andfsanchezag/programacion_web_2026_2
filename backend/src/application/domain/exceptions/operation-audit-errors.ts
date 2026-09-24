import { DomainException } from './DomainException';

/**
 * Operation and audit management exceptions.
 */

export class InvalidOperationException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class OperationNotFoundException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidOperationTypeException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidOperationUserException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidAffectedProductException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidAuditLogException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class AuditLogNotFoundException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class AuditLogAlreadyExistsException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidAuditInformationException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}