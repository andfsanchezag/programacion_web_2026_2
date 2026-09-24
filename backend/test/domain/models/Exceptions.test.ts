import { describe, it, expect } from 'vitest';
import { DomainException } from '../../../src/application/domain/exceptions/DomainException';
import {
  CustomerAlreadyExistsException,
  CustomerNotFoundException,
} from '../../../src/application/domain/exceptions/customer-errors';
import {
  InsufficientBalanceException,
  InvalidDepositException,
} from '../../../src/application/domain/exceptions/bank-account-errors';
import {
  LoanAlreadyApprovedException,
  LoanDisbursementException,
} from '../../../src/application/domain/exceptions/loan-errors';
import {
  TransferNotApprovedException,
  SameAccountTransferException,
} from '../../../src/application/domain/exceptions/transfer-errors';
import {
  UserNotActiveException,
  InvalidCredentialsException,
  SessionNotFoundException,
} from '../../../src/application/domain/exceptions/user-errors';
import {
  InvalidOperationException,
  AuditLogNotFoundException,
} from '../../../src/application/domain/exceptions/operation-audit-errors';
import {
  UnauthorizedApprovalException,
  NotificationDeliveryException,
} from '../../../src/application/domain/exceptions/authorization-errors';

describe('Domain exceptions', () => {
  it('all extend DomainException with a proper name', () => {
    const samples = [
      new CustomerAlreadyExistsException('a'),
      new CustomerNotFoundException('a'),
      new InsufficientBalanceException('a'),
      new InvalidDepositException('a'),
      new LoanAlreadyApprovedException('a'),
      new LoanDisbursementException('a'),
      new TransferNotApprovedException('a'),
      new SameAccountTransferException('a'),
      new UserNotActiveException('a'),
      new InvalidCredentialsException('a'),
      new SessionNotFoundException('a'),
      new InvalidOperationException('a'),
      new AuditLogNotFoundException('a'),
      new UnauthorizedApprovalException('a'),
      new NotificationDeliveryException('a'),
    ];
    for (const s of samples) {
      expect(s instanceof DomainException).toBe(true);
      expect(s.name).toBe(s.constructor.name);
      expect(typeof s.message).toBe('string');
    }
  });
});