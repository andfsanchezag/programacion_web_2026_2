import { describe, it, expect, vi } from 'vitest';
import { TransferService } from '../../../src/application/domain/services/TransferService';
import { Transfer } from '../../../src/application/domain/models/Transfer';
import {
  TransferNotFoundException,
  InvalidTransferException,
  TransferNotApprovedException,
} from '../../../src/application/domain/exceptions/transfer-errors';
import { UnauthorizedApprovalException } from '../../../src/application/domain/exceptions/authorization-errors';
import { UnauthorizedCustomerOperationException } from '../../../src/application/domain/exceptions/customer-errors';
import { TransferStatus } from '../../../src/application/domain/valueobjects/TransferStatus';
import { AccountStatus } from '../../../src/application/domain/valueobjects/AccountStatus';
import { SystemRole } from '../../../src/application/domain/valueobjects/SystemRole';
import { makeCustomer, makeUser, makeBankAccount, NOW } from '../../helpers';
import { transferRepo, accountRepo, operationRepo, auditRepo, authorization, configuration } from '../services/mocks';

function buildTransferModel(status: TransferStatus = TransferStatus.PENDING, creationDate: Date = NOW): Transfer {
  const owner = makeCustomer();
  return new Transfer(
    'tr-x',
    makeBankAccount(owner, AccountStatus.ACTIVE, 1000),
    makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0),
    500,
    creationDate,
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
  it('creates a transfer below the approval threshold as APPROVED (SDD 6.6)', async () => {
    const { service, transfers } = build();
    const transfer = new Transfer(
      'tr-small', buildTransferModel().sourceAccount, buildTransferModel().destinationAccount,
      100, NOW, makeUser(SystemRole.NATURAL_CUSTOMER), TransferStatus.PENDING
    );
    const saved = await service.createTransfer(makeUser(), transfer);
    expect(saved.transferStatus.code).toBe(TransferStatus.APPROVED.code);
    expect(transfers.save).toHaveBeenCalled();
  });

  it('submits high-value transfers for approval on creation', async () => {
    const { service } = build();
    const owner = makeCustomer();
    const transfer = new Transfer(
      'tr-large',
      makeBankAccount(owner, AccountStatus.ACTIVE, 10000),
      makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0),
      5000, NOW, makeUser(SystemRole.NATURAL_CUSTOMER, owner), TransferStatus.PENDING
    );
    await service.createTransfer(makeUser(SystemRole.BUSINESS_OPERATOR), transfer);
    expect(transfer.transferStatus.code).toBe(TransferStatus.WAITING_FOR_APPROVAL.code);
  });

  it('rejects transfers without sufficient source balance at creation (SDD 6.4/6.5)', async () => {
    const { service } = build();
    const owner = makeCustomer();
    const transfer = new Transfer(
      'tr-broke',
      makeBankAccount(owner, AccountStatus.ACTIVE, 100),
      makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0),
      500, NOW, makeUser(SystemRole.NATURAL_CUSTOMER, owner), TransferStatus.PENDING
    );
    await expect(service.createTransfer(makeUser(), transfer)).rejects.toThrow(/insufficient/i);
  });

  it('rejects invalid transfer amounts and unauthorized creation', async () => {
    const { service, authz } = build();
    const owner = makeCustomer();
    expect(() => {
      new Transfer('tr-zero', makeBankAccount(owner, AccountStatus.ACTIVE, 100), makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0), 0, NOW, makeUser(SystemRole.NATURAL_CUSTOMER));
    }).toThrow('Transfer amount must be positive');

    (authz.canExecute as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(service.createTransfer(makeUser(), buildTransferModel())).rejects.toThrow(UnauthorizedCustomerOperationException);
  });

  it('submits pending transfers for approval', async () => {
    const { service, transfers } = build();
    (transfers.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const transfer = buildTransferModel();
    expect((await service.submitForApproval(makeUser(), transfer)).transferStatus).toBe(TransferStatus.WAITING_FOR_APPROVAL);
  });

  it('approves and rejects waiting transfers only with authority', async () => {
    const { service, transfers, authz } = build();
    (transfers.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const approved = buildTransferModel();
    approved.submitForApproval();
    expect((await service.approveTransfer(makeUser(SystemRole.BUSINESS_SUPERVISOR), approved)).transferStatus.code).toBe(TransferStatus.APPROVED.code);

    const rejected = buildTransferModel();
    rejected.submitForApproval();
    expect((await service.rejectTransfer(makeUser(SystemRole.INTERNAL_ANALYST), rejected)).transferStatus.code).toBe(TransferStatus.REJECTED.code);

    (authz.canApprove as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(service.approveTransfer(makeUser(SystemRole.NATURAL_CUSTOMER), buildTransferModel())).rejects.toThrow(UnauthorizedApprovalException);
    await expect(service.rejectTransfer(makeUser(SystemRole.NATURAL_CUSTOMER), buildTransferModel())).rejects.toThrow(UnauthorizedApprovalException);
  });

  it('expires only transfers whose approval period elapsed', async () => {
    const { service, config, transfers } = build();
    (transfers.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const recent = buildTransferModel(TransferStatus.PENDING, new Date());
    recent.submitForApproval();
    await expect(service.expireTransfer(makeUser(), recent)).rejects.toThrow(InvalidTransferException);

    (config.getTransferApprovalExpirationHours as ReturnType<typeof vi.fn>).mockReturnValue(0);
    const old = buildTransferModel(
      TransferStatus.PENDING,
      new Date(Date.now() - 25 * 3600 * 1000)
    );
    old.submitForApproval();
    expect((await service.expireTransfer(makeUser(), old)).transferStatus).toBe(TransferStatus.EXPIRED);
  });

  it('executes an approved transfer moving funds between accounts', async () => {
    const { service, accounts, transfers } = build();
    (transfers.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const transfer = buildTransferModel();
    transfer.submitForApproval();
    transfer.approve(makeUser(SystemRole.BUSINESS_SUPERVISOR), NOW);
    await service.executeTransfer(makeUser(SystemRole.TELLER_EMPLOYEE), transfer);
    expect(transfer.sourceAccount.currentBalance).toBe(500);
    expect(transfer.destinationAccount.currentBalance).toBe(500);
    expect(accounts.update).toHaveBeenCalledTimes(2);
  });

  it('rolls back the source account when the destination update fails', async () => {
    const { service, accounts, transfers } = build();
    (transfers.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const transfer = buildTransferModel();
    transfer.submitForApproval();
    transfer.approve(makeUser(SystemRole.BUSINESS_SUPERVISOR), NOW);
    (accounts.update as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('db down'));
    await expect(service.executeTransfer(makeUser(SystemRole.TELLER_EMPLOYEE), transfer)).rejects.toThrow('db down');
    expect(transfer.sourceAccount.currentBalance).toBe(1000);
    expect(transfer.destinationAccount.currentBalance).toBe(0);
    expect(transfers.update).not.toHaveBeenCalled();
    expect(accounts.update).toHaveBeenCalledTimes(3);
  });

  it('rolls back both accounts when the transfer update fails', async () => {
    const { service, accounts, transfers } = build();
    (transfers.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const transfer = buildTransferModel();
    transfer.submitForApproval();
    transfer.approve(makeUser(SystemRole.BUSINESS_SUPERVISOR), NOW);
    (transfers.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('db down'));
    await expect(service.executeTransfer(makeUser(SystemRole.TELLER_EMPLOYEE), transfer)).rejects.toThrow('db down');
    expect(transfer.sourceAccount.currentBalance).toBe(1000);
    expect(transfer.destinationAccount.currentBalance).toBe(0);
    expect(transfers.update).toHaveBeenCalledTimes(1);
    expect(accounts.update).toHaveBeenCalledTimes(4);
  });

  it('prevents execution of non-approved transfers', async () => {
    const { service, transfers } = build();
    (transfers.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const transfer = buildTransferModel();
    await expect(service.executeTransfer(makeUser(), transfer)).rejects.toThrow(TransferNotApprovedException);
  });

  it('consults existing transfers and rejects unknown ones', async () => {
    const { service, transfers } = build();
    const transfer = buildTransferModel();
    (transfers.find as ReturnType<typeof vi.fn>).mockReturnValue(transfer);
    expect(await service.consultTransfer(makeUser(), transfer)).toBe(transfer);
    (transfers.find as ReturnType<typeof vi.fn>).mockReturnValue(null);
    await expect(service.consultTransfer(makeUser(), transfer)).rejects.toThrow(TransferNotFoundException);
  });
});