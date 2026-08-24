/**
 * ApprovalDecision - Technical enumeration representing the result of an
 * approval process. No business catalog metadata is required.
 */
export enum ApprovalDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Provides utility helpers for ApprovalDecision.
 */
export const ApprovalDecisionUtils = {
  isValid(value: string): boolean {
    return Object.values(ApprovalDecision).includes(value as ApprovalDecision);
  },
} as const;