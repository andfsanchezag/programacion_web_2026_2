import { describe, it, expect } from 'vitest';
import { Currency, InvalidCurrencyException } from '../../../application/domain/valueobjects/Currency';

describe('Currency', () => {
  it('exposes currencies and helpers', () => {
    expect(Currency.getAll().length).toBe(3);
    expect(Currency.fromIsoCode('COP')).toBe(Currency.COP);
    expect(Currency.isValidIsoCode('USD')).toBe(true);
    expect(Currency.isValidIsoCode('XXX')).toBe(false);
    expect(Currency.EUR.isoCode).toBe('EUR');
    expect(Currency.EUR.symbol.length).toBe(1);
  });

  it('throws on invalid iso code', () => {
    expect(() => Currency.fromIsoCode('XXX')).toThrow(InvalidCurrencyException);
  });

  it('compares by value', () => {
    expect(Currency.COP.equals(Currency.fromIsoCode('COP'))).toBe(true);
    expect(Currency.COP.equals(Currency.USD)).toBe(false);
    expect(Currency.COP.equals(null)).toBe(false);
    expect(Currency.COP.equals({})).toBe(false);
  });
});