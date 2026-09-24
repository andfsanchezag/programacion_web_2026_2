/**
 * Mappers de respuesta (F3/F7): validan la forma del DTO backend antes de
 * exponerla a la UI; forma inesperada → MappingError.
 */
import { describe, expect, it } from 'vitest';
import {
  mapAccount,
  mapAuditLog,
  mapBalance,
  mapCustomer,
  mapHealth,
  mapList,
  mapLoan,
  mapLoanPayment,
  mapLoginResponse,
  mapOperation,
  mapPaged,
  mapTransfer,
  mapUser,
} from './responseMappers';
import { MappingError } from '../../domain/errors';

describe('responseMappers', () => {
  it('mapea LoginResponseDTO y calcula expiración', () => {
    const session = mapLoginResponse({
      token: 't',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: { userId: 'u1', username: 'ana', email: 'a@e.com', role: 'NATURAL_CUSTOMER' },
    });
    expect(session.token).toBe('t');
    expect(session.user.role).toBe('NATURAL_CUSTOMER');
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  it('rechaza login sin token o con rol desconocido', () => {
    expect(() => mapLoginResponse({ tokenType: 'Bearer', expiresIn: 1, user: {} })).toThrow(MappingError);
    expect(() =>
      mapLoginResponse({
        token: 't',
        tokenType: 'Bearer',
        expiresIn: 1,
        user: { userId: 'u', username: 'x', role: 'SUPERADMIN' },
      }),
    ).toThrow(MappingError);
  });

  it('mapea cliente natural y empresa con representante', () => {
    const natural = mapCustomer({
      identification: '1017',
      name: 'Ana',
      email: 'a@e.com',
      status: 'ACTIVE',
      customerType: 'NATURAL',
    });
    expect(natural.customerType).toBe('NATURAL');
    expect(natural.legalRepresentative).toBeUndefined();

    const business = mapCustomer({
      identification: '9001',
      name: 'Tech',
      email: 'c@t.com',
      status: 'ACTIVE',
      customerType: 'BUSINESS',
      legalRepresentative: { identification: '1017', name: 'Ana' },
    });
    expect(business.legalRepresentative?.identification).toBe('1017');
  });

  it('rechaza customerType desconocido', () => {
    expect(() =>
      mapCustomer({ identification: '1', name: 'x', email: 'e', status: 'ACTIVE', customerType: 'ALIEN' }),
    ).toThrow(MappingError);
  });

  it('mapea cuenta, balance, préstamo, pago, transferencia, operación, auditoría y usuario', () => {
    expect(
      mapAccount({
        accountNumber: 'CTA-1',
        accountType: 'SAVINGS',
        ownerIdentification: '1017',
        availableBalance: 100,
        currency: 'COP',
        status: 'ACTIVE',
      }).accountNumber,
    ).toBe('CTA-1');

    expect(mapBalance({ accountNumber: 'CTA-1', availableBalance: 50, currency: 'COP' }).availableBalance).toBe(50);

    expect(
      mapLoan({ loanId: 'LOAN-1', loanType: 'PERSONAL', requestedAmount: 10, status: 'UNDER_REVIEW', termInMonths: 12 })
        .loanId,
    ).toBe('LOAN-1');

    expect(mapLoanPayment({ loanId: 'LOAN-1', status: 'DISBURSED' }).status).toBe('DISBURSED');

    expect(
      mapTransfer({
        transferId: 'TRF-1',
        sourceAccountNumber: 'CTA-1',
        destinationAccountNumber: 'CTA-2',
        amount: 5,
        status: 'EXECUTED',
        executedAt: '2026-09-13T10:30:00Z',
      }).status,
    ).toBe('EXECUTED');

    expect(
      mapOperation({
        operationId: 'OP-1',
        operationType: 'DEPOSIT',
        executionDate: '2026-09-13T10:30:00Z',
        performedBy: 'u1',
        affectedProduct: 'CTA-1',
      }).operationType,
    ).toBe('DEPOSIT');

    expect(
      mapAuditLog({
        auditId: 'A-1',
        operationType: 'LOAN_DISBURSEMENT',
        operationDate: '2026-09-13T11:00:00Z',
        performedBy: 'u9',
        userRole: 'INTERNAL_ANALYST',
        affectedProduct: 'LOAN-1',
        details: { disbursedAmount: 10 },
      }).auditId,
    ).toBe('A-1');

    expect(
      mapUser({ userId: 'usr_1', username: 'ana', role: 'TELLER_EMPLOYEE', status: 'ACTIVE' }).role,
    ).toBe('TELLER_EMPLOYEE');
  });

  it('rechaza operationType y montos con forma inválida', () => {
    expect(() =>
      mapOperation({
        operationId: 'OP-1',
        operationType: 'HACKEO',
        executionDate: 'x',
        performedBy: 'u',
        affectedProduct: 'p',
      }),
    ).toThrow(MappingError);
    expect(() => mapBalance({ accountNumber: 'CTA-1', availableBalance: 'mucho', currency: 'COP' })).toThrow(
      MappingError,
    );
  });

  it('mapea paginados y listas; exige arreglo', () => {
    const paged = mapPaged(
      { content: [{ auditId: 'A-1', operationType: 'DEPOSIT', operationDate: 'd', performedBy: 'u', userRole: 'TELLER_EMPLOYEE', affectedProduct: 'p', details: {} }], totalElements: 1, totalPages: 1 },
      mapAuditLog,
    );
    expect(paged.totalElements).toBe(1);
    expect(mapList([1, 2], (v) => v)).toEqual([1, 2]);
    expect(() => mapList({ not: 'array' }, (v) => v)).toThrow(MappingError);
    expect(mapHealth({ status: 'UP', persistence: 'ok' }).status).toBe('UP');
  });
});
