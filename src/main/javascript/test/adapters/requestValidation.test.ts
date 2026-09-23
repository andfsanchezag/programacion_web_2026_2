import { describe, it, expect } from 'vitest';
import {
  reqString, reqEmail, reqPhone, reqDate, reqNumber, InvalidRequestException,
} from '../../application/adapters/rest/validation/requestValidation';

describe('Validadores de DTO (contrato Rest-validation)', () => {
  it('reqString: requerido, tipos, blancos y límites', () => {
    expect(reqString('  abc  ', 'f')).toBe('  abc  ');
    expect(reqString(undefined, 'f', { optional: true })).toBeUndefined();
    expect(reqString(null, 'f', { optional: true })).toBeUndefined();
    expect(() => reqString(undefined, 'f')).toThrow(InvalidRequestException);
    expect(() => reqString(null, 'f')).toThrow('f: is required');
    expect(() => reqString(123, 'f')).toThrow('must be a string');
    expect(() => reqString('   ', 'f')).toThrow('min 1');
    expect(() => reqString('ab', 'f', { min: 3 })).toThrow('min 3');
    expect(() => reqString('abcdef', 'f', { max: 5 })).toThrow('max length 5');
  });

  it('reqEmail y reqPhone', () => {
    expect(reqEmail('a@b.co', 'e')).toBe('a@b.co');
    expect(reqEmail(undefined, 'e', { optional: true })).toBeUndefined();
    expect(() => reqEmail('no-mail', 'e')).toThrow('valid email');
    expect(() => reqEmail('a@b', 'e')).toThrow('valid email');
    expect(reqPhone('+573001234567', 'p')).toBe('+573001234567');
    expect(() => reqPhone('123', 'p')).toThrow('7-15 digits');
    expect(() => reqPhone('abc1234567', 'p')).toThrow('7-15 digits');
  });

  it('reqDate: ISO válida, inválida y pasado', () => {
    expect(reqDate('1990-01-01', 'd', { past: true })).toBe('1990-01-01');
    expect(reqDate(undefined, 'd', { optional: true })).toBeUndefined();
    expect(() => reqDate('no-fecha', 'd')).toThrow('ISO-8601');
    expect(() => reqDate('2999-01-01', 'd', { past: true })).toThrow('in the past');
    expect(() => reqDate(undefined, 'd')).toThrow('is required');
  });

  it('reqNumber: finito, entero y mínimo sin coerción', () => {
    expect(reqNumber(10, 'n')).toBe(10);
    expect(reqNumber(undefined, 'n', { optional: true })).toBeUndefined();
    expect(reqNumber(3, 'n', { min: 1, integer: true })).toBe(3);
    expect(() => reqNumber(undefined, 'n')).toThrow('is required');
    expect(() => reqNumber('10', 'n')).toThrow('must be a number');
    expect(() => reqNumber(Number.NaN, 'n')).toThrow('must be a number');
    expect(() => reqNumber(Number.POSITIVE_INFINITY, 'n')).toThrow('must be a number');
    expect(() => reqNumber(1.5, 'n', { integer: true })).toThrow('integer');
    expect(() => reqNumber(0, 'n', { min: 0.01 })).toThrow('>= 0.01');
  });

  it('InvalidRequestException expone campo y código estable', () => {
    const err = new InvalidRequestException('amount', 'must be a number');
    expect(err.name).toBe('InvalidRequestException');
    expect(err.field).toBe('amount');
    expect(err.message).toBe('amount: must be a number');
  });
});
