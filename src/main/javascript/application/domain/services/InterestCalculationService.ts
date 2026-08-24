/**
 * InterestCalculationService - Provides stateless business logic for interest
 * calculation over loans.
 */
export class InterestCalculationService {

  /**
   * Calculates the simple interest for a loan over a given term.
   *
   * @param principal the loan principal amount.
   * @param annualRatePercent the annual interest rate expressed as a percentage.
   * @param termInMonths the loan term expressed in months.
   * @returns the total interest for the loan term.
   */
  calculateSimpleInterest(
    principal: number,
    annualRatePercent: number,
    termInMonths: number
  ): number {
    if (principal <= 0) {
      throw new InvalidInterestCalculationException('Principal must be positive');
    }
    if (annualRatePercent < 0) {
      throw new InvalidInterestCalculationException('Annual rate must not be negative');
    }
    if (termInMonths <= 0) {
      throw new InvalidInterestCalculationException('Term must be positive');
    }
    const rate = annualRatePercent / 100;
    const timeInYears = termInMonths / 12;
    return principal * rate * timeInYears;
  }

  /**
   * Calculates the total amount payable including principal and interest.
   */
  calculateTotalPayable(
    principal: number,
    annualRatePercent: number,
    termInMonths: number
  ): number {
    const interest = this.calculateSimpleInterest(
      principal,
      annualRatePercent,
      termInMonths
    );
    return principal + interest;
  }
}

export class InvalidInterestCalculationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInterestCalculationException';
  }
}