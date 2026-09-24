import { DomainCatalog } from './DomainCatalog';

/**
 * Currency - Represents a currency used in banking products.
 * A business Value Object because its meaning is determined by its controlled
 * values. Extends DomainCatalog with ISO code and symbol.
 */
export class Currency extends DomainCatalog {
  private static readonly VALUES: Map<string, Currency> = new Map();

  static readonly COP = Currency.create('COP', 'Colombian Peso', 'Colombian Peso', 'COP', '$');
  static readonly USD = Currency.create('USD', 'United States Dollar', 'United States Dollar', 'USD', '$');
  static readonly EUR = Currency.create('EUR', 'Euro', 'Euro', 'EUR', '\u20AC');

  private readonly _isoCode: string;
  private readonly _symbol: string;

  private constructor(code: string, name: string, description: string, isoCode: string, symbol: string) {
    super(code, name, description);
    this._isoCode = isoCode;
    this._symbol = symbol;
  }

  private static create(code: string, name: string, description: string, isoCode: string, symbol: string): Currency {
    const currency = new Currency(code, name, description, isoCode, symbol);
    Currency.VALUES.set(isoCode, currency);
    return currency;
  }

  get isoCode(): string {
    return this._isoCode;
  }

  get symbol(): string {
    return this._symbol;
  }

  static fromIsoCode(isoCode: string): Currency {
    const currency = Currency.VALUES.get(isoCode);
    if (!currency) {
      throw new InvalidCurrencyException(`Invalid currency ISO code: ${isoCode}`);
    }
    return currency;
  }

  static getAll(): Currency[] {
    return Array.from(Currency.VALUES.values());
  }

  static isValidIsoCode(isoCode: string): boolean {
    return Currency.VALUES.has(isoCode);
  }

  equals(other: unknown): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (this === other) {
      return true;
    }
    if (!(other instanceof Currency)) {
      return false;
    }
    return this._isoCode === other._isoCode;
  }
}

export class InvalidCurrencyException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCurrencyException';
  }
}