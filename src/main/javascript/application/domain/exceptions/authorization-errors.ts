import { DomainException } from './DomainException';

/**
 * Authorization exceptions.
 */

export class UnauthorizedOperationException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class UnauthorizedProductAccessException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class UnauthorizedCustomerAccessException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class UnauthorizedApprovalException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Notification port exception.
 */
export class NotificationDeliveryException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}