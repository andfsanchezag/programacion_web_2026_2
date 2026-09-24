/**
 * DomainException - Abstract base class for all business exceptions in the domain.
 *
 * Business exceptions belong exclusively to the domain layer and must remain
 * independent from any technology.
 */
export abstract class DomainException extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}