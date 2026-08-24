import { describe, it, expect } from 'vitest';
import { DomainException } from '../../../application/domain/exceptions/DomainException';
import {
  CustomerAlreadyExistsException,
  CustomerNotFoundException,
} from '../../../application/domain/exceptions/customer-errors';
import {
  InsufficientBalanceException,
  InvalidDepositException,
} from '../../../application/domain/exceptions/bank-account-errors';
import {
  LoanAlreadyApprovedException,
  LoanDisbursementException,
} from '../../../application/domain/exceptions/loan-errors';
import {
  TransferNotApprovedException,
  SameAccountTransferException,
} from '../../../application/domain/exceptions/transfer-errors';
import {
  UserNotActiveException,
  InvalidCredentialsException,
  SessionNotFoundException,
} from '../../../application/domain/exceptions/user-errors';
import {
  InvalidOperationException,
  AuditLogNotFoundException,
} from '../../../application/domain/exceptions/operation-audit-errors';
import {
  UnauthorizedApprovalException,
  NotificationDeliveryException,
} from '../../../application/domain/exceptions/authorization-errors';

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