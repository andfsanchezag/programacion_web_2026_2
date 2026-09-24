/**
 * BankingProduct (Abstract) - Represents both financial products and banking services.
 * BankAccount, Loan, and Transfer are specializations of BankingProduct.
 * `identifier` is the common identity attribute of all banking products and services.
 */
export abstract class BankingProduct {
  private readonly _identifier: string;

  protected constructor(identifier: string) {
    if (identifier === null || identifier === undefined || identifier.trim().length === 0) {
      throw new InvalidBankingProductException('Banking product identifier must not be empty');
    }
    this._identifier = identifier;
  }

  get identifier(): string {
    return this._identifier;
  }
}

export class InvalidBankingProductException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBankingProductException';
  }
}