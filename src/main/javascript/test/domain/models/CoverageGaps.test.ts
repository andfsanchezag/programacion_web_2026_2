import { describe, it, expect, vi } from 'vitest';
import { NaturalCustomer } from '../../../application/domain/models/NaturalCustomer';
import { Operation } from '../../../application/domain/models/Operation';
import { AuditLog } from '../../../application/domain/models/AuditLog';
import { CustomerStatus } from '../../../application/domain/valueobjects/CustomerStatus';
import { OperationType } from '../../../application/domain/valueobjects/OperationType';
import { AccountStatus } from '../../../application/domain/valueobjects/AccountStatus';
import { SystemRole } from '../../../application/domain/valueobjects/SystemRole';
import {
  InvalidLegalRepresentativeException,
  InvalidCustomerStatusTransitionException,
} from '../../../application/domain/exceptions/customer-errors';
import {
  InvalidUserStatusTransitionException,
  InvalidCredentialsActiveException,
} from '../../../application/domain/exceptions/user-errors';
import {
  InvalidAccountStatusException,
  InvalidAccountOwnershipException,
  InvalidWithdrawalException,
} from '../../../application/domain/exceptions/bank-account-errors';
import {
  InvalidLoanException,
  InvalidLoanTermException,
  InvalidInterestRateException,
  InvalidDestinationAccountException,
} from '../../../application/domain/exceptions/loan-errors';
import {
  TransferAlreadyApprovedException,
  TransferAlreadyExecutedException,
  InvalidTransferAmountException,
} from '../../../application/domain/exceptions/transfer-errors';
import {
  OperationNotFoundException,
  InvalidOperationTypeException,
  AuditLogAlreadyExistsException,
} from '../../../application/domain/exceptions/operation-audit-errors';
import {
  UnauthorizedOperationException,
  UnauthorizedProductAccessException,
  UnauthorizedCustomerAccessException,
} from '../../../application/domain/exceptions/authorization-errors';
import { NOW, makeCustomer, makeUser, makeBankAccount } from '../../helpers';

// ---------------------------------------------------------------- exceptions

describe('Remaining domain exception classes', () => {
  it('can be instantiated with a message', () => {
    const samples = [
      new InvalidLegalRepresentativeException('x'),
      new InvalidCustomerStatusTransitionException('x'),
      new InvalidUserStatusTransitionException('x'),
      new InvalidCredentialsActiveException('x'),
      new InvalidAccountStatusException('x'),
      new InvalidAccountOwnershipException('x'),
      new InvalidWithdrawalException('x'),
      new InvalidLoanException('x'),
      new InvalidLoanTermException('x'),
      new InvalidInterestRateException('x'),
      new InvalidDestinationAccountException('x'),
      new TransferAlreadyApprovedException('x'),
      new TransferAlreadyExecutedException('x'),
      new InvalidTransferAmountException('x'),
      new OperationNotFoundException('x'),
      new InvalidOperationTypeException('x'),
      new AuditLogAlreadyExistsException('x'),
      new UnauthorizedOperationException('x'),
      new UnauthorizedProductAccessException('x'),
      new UnauthorizedCustomerAccessException('x'),
    ];
    expect(samples.length).toBe(20);
    samples.forEach((s) => {
      expect(s.message).toBe('x');
      expect(s.name).toBe(s.constructor.name);
    });
  });
});

// ------------------------------------------------------- model getter branches

describe('Model coverage gaps', () => {
  it('exposes the performing user of an operation', () => {
    const user = makeUser();
    const op = new Operation(
      'op-x', OperationType.DEPOSIT, NOW, user,
      makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0)
    );
    expect(op.performedBy).toBe(user);
  });

  it('rejects audit records without operation type, user or product', () => {
    const user = makeUser();
    const product = makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0);
    const details = new Map<string, unknown>();

    expect(() => new AuditLog('a-1', null as never, NOW, user, product, details))
      .toThrow('Audit operation type must be provided');
    expect(() => new AuditLog('a-2', OperationType.DEPOSIT, NOW, null as never, product, details))
      .toThrow('Audit user must be provided');
    expect(() => new AuditLog('a-3', OperationType.DEPOSIT, NOW, user, null as never, details))
      .toThrow('Audit affected product must be provided');
  });

  it('rejects registration when the customer status is not a valid catalog value', () => {
    class FakeStatusCustomer extends NaturalCustomer {
      get status(): CustomerStatus {
        return { isValid: () => false, code: 'BAD' } as unknown as CustomerStatus;
      }
    }
    const customer = new FakeStatusCustomer(
      'c-fake', 'id-fake', 'Fake', 'f@x.com', '31', 'Dir',
      SystemRole.NATURAL_CUSTOMER, CustomerStatus.ACTIVE, NOW, 'nat-fake'
    );
    expect(() => customer.validateRegistration()).toThrow(/Invalid customer status: BAD/);
  });
});