import { describe, it, expect, vi } from 'vitest';
import { OperationAuditService } from '../../../application/domain/services/OperationAuditService';
import { AuthorizationService } from '../../../application/domain/services/AuthorizationService';
import { InterestCalculationService, InvalidInterestCalculationException } from '../../../application/domain/services/InterestCalculationService';
import { OperationType } from '../../../application/domain/valueobjects/OperationType';
import { AccountStatus } from '../../../application/domain/valueobjects/AccountStatus';
import { SystemRole } from '../../../application/domain/valueobjects/SystemRole';
import { UserStatus } from '../../../application/domain/valueobjects/UserStatus';
import { Operation } from '../../../application/domain/models/Operation';
import { AuditLog } from '../../../application/domain/models/AuditLog';
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
  it('registers and consults operations', () => {
    const operations = operationRepo();
    const audits = auditRepo();
    const service = new OperationAuditService(operations, audits);
    const op = makeOperation();
    expect(service.registerOperation(op)).toBe(op);
    expect(operations.save).toHaveBeenCalledWith(op);
    expect(service.consultOperations(makeUser(), op.affectedProduct)).toEqual([]);
    expect(operations.findByProduct).toHaveBeenCalled();
  });

  it('registers and consults audit records', () => {
    const operations = operationRepo();
    const audits = auditRepo();
    const service = new OperationAuditService(operations, audits);
    const audit = makeAudit();
    expect(service.registerAuditEvent(audit)).toBe(audit);
    expect(audits.save).toHaveBeenCalledWith(audit);
    expect(service.consultAuditLog(makeUser(), audit.affectedProduct)).toEqual([]);
  });
});

describe('AuthorizationService', () => {
  const authz = new AuthorizationService();

  it('denies permissions to missing or invalid users', () => {
    expect(authz.hasPermission(undefined as never)).toBe(false);
    expect(authz.hasPermission(null as never)).toBe(false);
  });

  it('grants customer access to employees and to the owner', () => {
    const customer = makeCustomer();
    const teller = makeUser(SystemRole.TELLER_EMPLOYEE);
    expect(authz.canAccessCustomer(teller, customer)).toBe(true);
    const ownerUser = makeUser(SystemRole.NATURAL_CUSTOMER, customer);
    expect(authz.canAccessCustomer(ownerUser, customer)).toBe(true);
    const stranger = makeUser(SystemRole.NATURAL_CUSTOMER);
    expect(authz.canAccessCustomer(stranger, customer)).toBe(false);
  });

  it('controls product access and execution', () => {
    const account = makeBankAccount(makeCustomer());
    const owner = account.owner;
    const ownerUser = makeUser(SystemRole.NATURAL_CUSTOMER, owner);
    expect(authz.canAccessProduct(ownerUser, account)).toBe(true);
    expect(authz.canExecute(ownerUser, account)).toBe(true);
    expect(authz.canAccessProduct(undefined as never, account)).toBe(false);
  });

  it('restricts loan approval authority to Internal Analysts', () => {
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

  it('calculates simple interest and total payable', () => {
    expect(calc.calculateSimpleInterest(10000, 12, 12)).toBeCloseTo(1200);
    expect(calc.calculateTotalPayable(10000, 12, 12)).toBeCloseTo(11200);
  });

  it('rejects invalid calculation inputs', () => {
    expect(() => calc.calculateSimpleInterest(0, 10, 10)).toThrow(InvalidInterestCalculationException);
    expect(() => calc.calculateSimpleInterest(100, -1, 10)).toThrow(InvalidInterestCalculationException);
    expect(() => calc.calculateSimpleInterest(100, 10, 0)).toThrow(InvalidInterestCalculationException);
  });
});