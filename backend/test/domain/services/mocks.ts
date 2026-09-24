import { vi } from 'vitest';
import { CustomerRepositoryPort } from '../../../src/application/domain/ports/out/CustomerRepositoryPort';
import { UserRepositoryPort } from '../../../src/application/domain/ports/out/UserRepositoryPort';
import { BankAccountRepositoryPort } from '../../../src/application/domain/ports/out/BankAccountRepositoryPort';
import { LoanRepositoryPort } from '../../../src/application/domain/ports/out/LoanRepositoryPort';
import { TransferRepositoryPort } from '../../../src/application/domain/ports/out/TransferRepositoryPort';
import { OperationRepositoryPort } from '../../../src/application/domain/ports/out/OperationRepositoryPort';
import { AuditLogRepositoryPort } from '../../../src/application/domain/ports/out/AuditLogRepositoryPort';
import { AuthorizationPort } from '../../../src/application/domain/ports/out/AuthorizationPort';
import { PasswordServicePort } from '../../../src/application/domain/ports/out/PasswordServicePort';
import { JwtTokenServicePort } from '../../../src/application/domain/ports/out/JwtTokenServicePort';
import { BusinessConfigurationPort } from '../../../src/application/domain/ports/out/BusinessConfigurationPort';

export function customerRepo(): CustomerRepositoryPort {
  return {
    save: vi.fn(async (c) => c),
    findByIdentification: vi.fn(async () => null),
    findByEmail: vi.fn(async () => null),
    existsByIdentification: vi.fn(async () => false),
    existsByEmail: vi.fn(async () => false),
    findAll: vi.fn(async () => []),
    update: vi.fn(async () => {}),
  };
}

export function userRepo(): UserRepositoryPort {
  return {
    save: vi.fn(async (u) => u),
    findByUsername: vi.fn(async () => null),
    findById: vi.fn(async () => null),
    existsByUsername: vi.fn(async () => false),
    update: vi.fn(async () => {}),
  };
}

export function accountRepo(): BankAccountRepositoryPort {
  return {
    save: vi.fn(async (a) => a),
    find: vi.fn(async () => null),
    exists: vi.fn(async () => false),
    update: vi.fn(async () => {}),
    findAllByOwner: vi.fn(async () => []),
  };
}

export function loanRepo(): LoanRepositoryPort {
  return {
    save: vi.fn(async (l) => l),
    find: vi.fn(async () => null),
    exists: vi.fn(async () => false),
    update: vi.fn(async () => {}),
    findAllByApplicant: vi.fn(async () => []),
  };
}

export function transferRepo(): TransferRepositoryPort {
  return {
    save: vi.fn(async (t) => t),
    find: vi.fn(async () => null),
    exists: vi.fn(async () => false),
    update: vi.fn(async () => {}),
    findAll: vi.fn(async () => []),
  };
}

export function operationRepo(): OperationRepositoryPort {
  return {
    save: vi.fn(async (o) => o),
    find: vi.fn(async () => null),
    findByProduct: vi.fn(async () => []),
    exists: vi.fn(async () => false),
    findAll: vi.fn(async () => []),
  };
}

export function auditRepo(): AuditLogRepositoryPort {
  return {
    save: vi.fn(async (a) => a),
    find: vi.fn(async () => null),
    findByProduct: vi.fn(async () => []),
    exists: vi.fn(async () => false),
    findAll: vi.fn(async () => []),
    findPaged: vi.fn(async () => ({ content: [], totalElements: 0, totalPages: 1, page: 0, size: 20 })),
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