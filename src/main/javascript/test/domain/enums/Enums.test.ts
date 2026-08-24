import { describe, it, expect } from 'vitest';
import { ApprovalDecision, ApprovalDecisionUtils } from '../../../application/domain/enums/ApprovalDecision';
import { NotificationChannel } from '../../../application/domain/enums/NotificationChannel';
import { AuditSeverity } from '../../../application/domain/enums/AuditSeverity';

describe('Enums', () => {
  it('ApprovalDecision exposes values and validation', () => {
    expect(ApprovalDecision.APPROVED).toBe('APPROVED');
    expect(ApprovalDecision.REJECTED).toBe('REJECTED');
    expect(ApprovalDecisionUtils.isValid('APPROVED')).toBe(true);
    expect(ApprovalDecisionUtils.isValid('NOPE')).toBe(false);
  });

  it('NotificationChannel exposes channels', () => {
    expect(NotificationChannel.EMAIL).toBe('EMAIL');
    expect(NotificationChannel.SMS).toBe('SMS');
    expect(NotificationChannel.PUSH_NOTIFICATION).toBe('PUSH_NOTIFICATION');
  });

  it('AuditSeverity exposes levels', () => {
    expect(AuditSeverity.INFORMATION).toBe('INFORMATION');
    expect(AuditSeverity.WARNING).toBe('WARNING');
    expect(AuditSeverity.ERROR).toBe('ERROR');
    expect(AuditSeverity.CRITICAL).toBe('CRITICAL');
  });
});