import { vi } from 'vitest';
import { CustomerRepositoryPort } from '../../../application/domain/ports/out/CustomerRepositoryPort';
import { UserRepositoryPort } from '../../../application/domain/ports/out/UserRepositoryPort';
import { BankAccountRepositoryPort } from '../../../application/domain/ports/out/BankAccountRepositoryPort';
import { LoanRepositoryPort } from '../../../application/domain/ports/out/LoanRepositoryPort';
import { TransferRepositoryPort } from '../../../application/domain/ports/out/TransferRepositoryPort';
import { OperationRepositoryPort } from '../../../application/domain/ports/out/OperationRepositoryPort';
import { AuditLogRepositoryPort } from '../../../application/domain/ports/out/AuditLogRepositoryPort';
import { AuthorizationPort } from '../../../application/domain/ports/out/AuthorizationPort';
import { PasswordServicePort } from '../../../application/domain/ports/out/PasswordServicePort';
import { JwtTokenServicePort } from '../../../application/domain/ports/out/JwtTokenServicePort';
import { BusinessConfigurationPort } from '../../../application/domain/ports/out/BusinessConfigurationPort';

export function customerRepo(): CustomerRepositoryPort {
  return {
    save: vi.fn((c) => c),
    findByIdentification: vi.fn(() => null),
    findByEmail: vi.fn(() => null),
    existsByIdentification: vi.fn(() => false),
    existsByEmail: vi.fn(() => false),
    findAll: vi.fn(() => []),
    update: vi.fn(),
  };
}

export function userRepo(): UserRepositoryPort {
  return {
    save: vi.fn((u) => u),
    findByUsername: vi.fn(() => null),
    findById: vi.fn(() => null),
    existsByUsername: vi.fn(() => false),
    update: vi.fn(),
  };
}

export function accountRepo(): BankAccountRepositoryPort {
  return {
    save: vi.fn((a) => a),
    find: vi.fn(() => null),
    exists: vi.fn(() => false),
    update: vi.fn(),
    findAllByOwner: vi.fn(() => []),
  };
}

export function loanRepo(): LoanRepositoryPort {
  return {
    save: vi.fn((l) => l),
    find: vi.fn(() => null),
    exists: vi.fn(() => false),
    update: vi.fn(),
    findAllByApplicant: vi.fn(() => []),
  };
}

export function transferRepo(): TransferRepositoryPort {
  return {
    save: vi.fn((t) => t),
    find: vi.fn(() => null),
    exists: vi.fn(() => false),
    update: vi.fn(),
  };
}

export function operationRepo(): OperationRepositoryPort {
  return {
    save: vi.fn((o) => o),
    find: vi.fn(() => null),
    findByProduct: vi.fn(() => []),
    exists: vi.fn(() => false),
  };
}

export function auditRepo(): AuditLogRepositoryPort {
  return {
    save: vi.fn((a) => a),
    find: vi.fn(() => null),
    findByProduct: vi.fn(() => []),
    exists: vi.fn(() => false),
  };
}

export function authorization(overrides: Partial<AuthorizationPort> = {}): AuthorizationPort {
  return {
    canExecute: vi.fn(() => true),
    canAccessCustomer: vi.fn(() => true),
    canApprove: vi.fn(() => true),
    ...overrides,
  } as AuthorizationPort;
}

export function passwordService(): PasswordServicePort {
  return {
    encode: vi.fn((raw) => `encoded-${raw}`),
    matches: vi.fn(() => true),
  };
}

export function jwtService(): JwtTokenServicePort {
  return {
    generate: vi.fn(() => 'token-123'),
    extractUsername: vi.fn(() => 'user'),
    extractRole: vi.fn(() => null),
    isValid: vi.fn(() => true),
  };
}

export function configuration(threshold = 1000, hours = 24): BusinessConfigurationPort {
  return {
    getTransferApprovalThreshold: vi.fn(() => threshold),
    getTransferApprovalExpirationHours: vi.fn(() => hours),
  };
}