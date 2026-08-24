import { describe, it, expect, vi } from 'vitest';
import { TransferService } from '../../../application/domain/services/TransferService';
import { Transfer } from '../../../application/domain/models/Transfer';
import {
  TransferNotFoundException,
  InvalidTransferException,
  TransferNotApprovedException,
} from '../../../application/domain/exceptions/transfer-errors';
import { UnauthorizedApprovalException } from '../../../application/domain/exceptions/authorization-errors';
import { UnauthorizedCustomerOperationException } from '../../../application/domain/exceptions/customer-errors';
import { TransferStatus } from '../../../application/domain/valueobjects/TransferStatus';
import { AccountStatus } from '../../../application/domain/valueobjects/AccountStatus';
import { SystemRole } from '../../../application/domain/valueobjects/SystemRole';
import { makeCustomer, makeUser, makeBankAccount, NOW } from '../../helpers';
import { transferRepo, accountRepo, operationRepo, auditRepo, authorization, configuration } from '../services/mocks';

function buildTransferModel(status: TransferStatus = TransferStatus.PENDING): Transfer {
  const owner = makeCustomer();
  return new Transfer(
    'tr-x',
    makeBankAccount(owner, AccountStatus.ACTIVE, 1000),
    makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0),
    500,
    NOW,
    makeUser(SystemRole.NATURAL_CUSTOMER, owner),
    status
  );
}

function build() {
  const transfers = transferRepo();
  const accounts = accountRepo();
  const operations = operationRepo();
  const audits = auditRepo();
  const authz = authorization();
  const config = configuration(1000, 24);
  const service = new TransferService(transfers, accounts, operations, audits, authz, config);
  return { service, transfers, accounts, operations, audits, authz, config };
}

describe('TransferService', () => {
  it('creates a transfer below the approval threshold', () => {
    const { service, transfers } = build();
    const transfer = new Transfer(
      'tr-small', buildTransferModel().sourceAccount, buildTransferModel().destinationAccount,
      100, NOW, makeUser(SystemRole.NATURAL_CUSTOMER), TransferStatus.PENDING
    );
    const saved = service.createTransfer(makeUser(), transfer);
    expect(saved.transferStatus.code).toBe(TransferStatus.PENDING.code);
    expect(transfers.save).toHaveBeenCalled();
  });

  it('submits high-value transfers for approval on creation', () => {
    const { service } = build();
    const owner = makeCustomer();
    const transfer = new Transfer(
      'tr-large',
      makeBankAccount(owner, AccountStatus.ACTIVE, 10000),
      makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0),
      5000, NOW, makeUser(SystemRole.NATURAL_CUSTOMER, owner), TransferStatus.PENDING
    );
    service.createTransfer(makeUser(SystemRole.BUSINESS_OPERATOR), transfer);
    expect(transfer.transferStatus.code).toBe(TransferStatus.WAITING_FOR_APPROVAL.code);
  });

  it('rejects invalid transfer amounts and unauthorized creation', () => {
    const { service, authz } = build();
    const owner = makeCustomer();
    expect(() => {
      const zero = new Transfer('tr-zero', makeBankAccount(owner, AccountStatus.ACTIVE, 100), makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0), 0, NOW, makeUser(SystemRole.NATURAL_CUSTOMER));
      service.createTransfer(makeUser(SystemRole.BUSINESS_OPERATOR), zero);
    }).toThrow('Transfer amount must be positive');

    (authz.canExecute as ReturnType<typeof vi.fn>).mockReturnValue(false);
    expect(() => service.createTransfer(makeUser(), buildTransferModel())).toThrow(UnauthorizedCustomerOperationException);
  });

  it('submits pending transfers for approval', () => {
    const { service, transfers } = build();
    (transfers.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const transfer = buildTransferModel();
    expect(service.submitForApproval(makeUser(), transfer).transferStatus).toBe(TransferStatus.WAITING_FOR_APPROVAL);
  });

  it('approves and rejects waiting transfers only with authority', () => {
    const { service, transfers, authz } = build();
    (transfers.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const approved = buildTransferModel();
    approved.submitForApproval();
    expect(service.approveTransfer(makeUser(SystemRole.BUSINESS_SUPERVISOR), approved).transferStatus.code).toBe(TransferStatus.APPROVED.code);

    const rejected = buildTransferModel();
    rejected.submitForApproval();
    expect(service.rejectTransfer(makeUser(SystemRole.INTERNAL_ANALYST), rejected).transferStatus.code).toBe(TransferStatus.REJECTED.code);

    (authz.canApprove as ReturnType<typeof vi.fn>).mockReturnValue(false);
    expect(() => service.approveTransfer(makeUser(SystemRole.NATURAL_CUSTOMER), buildTransferModel())).toThrow(UnauthorizedApprovalException);
    expect(() => service.rejectTransfer(makeUser(SystemRole.NATURAL_CUSTOMER), buildTransferModel())).toThrow(UnauthorizedApprovalException);
  });

  it('expires only transfers whose approval period elapsed', () => {
    const { service, config, transfers } = build();
    (transfers.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const recent = buildTransferModel();
    recent.submitForApproval();
    expect(() => service.expireTransfer(makeUser(), recent)).toThrow(InvalidTransferException);

    (config.getTransferApprovalExpirationHours as ReturnType<typeof vi.fn>).mockReturnValue(0);
    const old = buildTransferModel();
    old.submitForApproval();
    expect(service.expireTransfer(makeUser(), old).transferStatus).toBe(TransferStatus.EXPIRED);
  });

  it('executes an approved transfer moving funds between accounts', () => {
    const { service, accounts, transfers } = build();
    (transfers.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const transfer = buildTransferModel();
    transfer.submitForApproval();
    transfer.approve(makeUser(SystemRole.BUSINESS_SUPERVISOR), NOW);
    service.executeTransfer(makeUser(SystemRole.TELLER_EMPLOYEE), transfer);
    expect(transfer.sourceAccount.currentBalance).toBe(500);
    expect(transfer.destinationAccount.currentBalance).toBe(500);
    expect(accounts.update).toHaveBeenCalledTimes(2);
  });

  it('prevents execution of non-approved transfers', () => {
    const { service, transfers } = build();
    (transfers.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const transfer = buildTransferModel();
    expect(() => service.executeTransfer(makeUser(), transfer)).toThrow(TransferNotApprovedException);
  });

  it('consults existing transfers and rejects unknown ones', () => {
    const { service, transfers } = build();
    const transfer = buildTransferModel();
    (transfers.find as ReturnType<typeof vi.fn>).mockReturnValue(transfer);
    expect(service.consultTransfer(makeUser(), transfer)).toBe(transfer);
    (transfers.find as ReturnType<typeof vi.fn>).mockReturnValue(null);
    expect(() => service.consultTransfer(makeUser(), transfer)).toThrow(TransferNotFoundException);
  });
});