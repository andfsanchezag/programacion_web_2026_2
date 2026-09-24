import { describe, it, expect, vi } from 'vitest';
import { OperationAuditService } from '../../../src/application/domain/services/OperationAuditService';
import { AuthorizationService } from '../../../src/application/domain/services/AuthorizationService';
import { InterestCalculationService, InvalidInterestCalculationException } from '../../../src/application/domain/services/InterestCalculationService';
import { OperationType } from '../../../src/application/domain/valueobjects/OperationType';
import { AccountStatus } from '../../../src/application/domain/valueobjects/AccountStatus';
import { SystemRole } from '../../../src/application/domain/valueobjects/SystemRole';
import { UserStatus } from '../../../src/application/domain/valueobjects/UserStatus';
import { Operation } from '../../../src/application/domain/models/Operation';
import { AuditLog } from '../../../src/application/domain/models/AuditLog';
import { makeCustomer, makeUser, makeBankAccount } from '../../helpers';
import { operationRepo, auditRepo } from '../services/mocks';

const product = () => makeBankAccount(makeCustomer(), AccountStatus.ACTIVE, 0);

function makeOperation(): Operation {
  return new Operation('op-1', OperationType.DEPOSIT, new Date(), makeUser(), product());
}

function makeAudit(): AuditLog {
  return new AuditLog(
    'aud-1', OperationType.DEPOSIT, new Date(), makeUser(), product(),
    new Map<string, unknown>()
  );
}

describe('OperationAuditService', () => {
  it('registers and consults operations', async () => {
    const operations = operationRepo();
    const audits = auditRepo();
    const service = new OperationAuditService(operations, audits);
    const op = makeOperation();
    expect(await service.registerOperation(op)).toBe(op);
    expect(operations.save).toHaveBeenCalledWith(op);
    expect(await service.consultOperations(makeUser(), op.affectedProduct)).toEqual([]);
    expect(operations.findByProduct).toHaveBeenCalled();
  });

  it('registers and consults audit records', async () => {
    const operations = operationRepo();
    const audits = auditRepo();
    const service = new OperationAuditService(operations, audits);
    const audit = makeAudit();
    expect(await service.registerAuditEvent(audit)).toBe(audit);
    expect(audits.save).toHaveBeenCalledWith(audit);
    expect(await service.consultAuditLog(makeUser(), audit.affectedProduct)).toEqual([]);
  });
});

describe('AuthorizationService', () => {
  const authz = new AuthorizationService();

  it('denies permissions to missing or invalid users', async () => {
    expect(authz.hasPermission(undefined as never)).toBe(false);
    expect(authz.hasPermission(null as never)).toBe(false);
  });

  it('grants customer access to employees and to the owner', async () => {
    const customer = makeCustomer();
    const teller = makeUser(SystemRole.TELLER_EMPLOYEE);
    expect(authz.canAccessCustomer(teller, customer)).toBe(true);
    const ownerUser = makeUser(SystemRole.NATURAL_CUSTOMER, customer);
    expect(authz.canAccessCustomer(ownerUser, customer)).toBe(true);
    const stranger = makeUser(SystemRole.NATURAL_CUSTOMER);
    expect(authz.canAccessCustomer(stranger, customer)).toBe(false);
  });

  it('controls product access and execution', async () => {
    const account = makeBankAccount(makeCustomer());
    const owner = account.owner;
    const ownerUser = makeUser(SystemRole.NATURAL_CUSTOMER, owner);
    expect(authz.canAccessProduct(ownerUser, account)).toBe(true);
    expect(authz.canExecute(ownerUser, account)).toBe(true);
    expect(authz.canAccessProduct(undefined as never, account)).toBe(false);
  });

  it('restricts loan approval authority to Internal Analysts', async () => {
    const analyst = makeUser(SystemRole.INTERNAL_ANALYST);
    const supervisor = makeUser(SystemRole.BUSINESS_SUPERVISOR);
    const loanProduct = product();
    expect(authz.canApprove(analyst, loanProduct)).toBe(false);
    expect(authz.canApprove(supervisor, loanProduct)).toBe(false);
    expect(authz.canApproveApproval(analyst)).toBe(true);
    expect(authz.canApproveApproval(supervisor)).toBe(true);
  });
});

describe('InterestCalculationService', () => {
  const calc = new InterestCalculationService();

  it('calculates simple interest and total payable', async () => {
    expect(calc.calculateSimpleInterest(10000, 12, 12)).toBeCloseTo(1200);
    expect(calc.calculateTotalPayable(10000, 12, 12)).toBeCloseTo(11200);
  });

  it('rejects invalid calculation inputs', async () => {
    expect(() => calc.calculateSimpleInterest(0, 10, 10)).toThrow(InvalidInterestCalculationException);
    expect(() => calc.calculateSimpleInterest(100, -1, 10)).toThrow(InvalidInterestCalculationException);
    expect(() => calc.calculateSimpleInterest(100, 10, 0)).toThrow(InvalidInterestCalculationException);
  });
});