/**
 * DomainCatalog - Abstract base class for all business catalog value objects.
 *
 * Represents a generic business catalog used throughout the banking domain.
 * Provides a consistent structure for controlled business values that require
 * a code, human-readable name, and business description.
 *
 * This class cannot be instantiated directly.
 */
export abstract class DomainCatalog {
  private readonly _code: string;
  private readonly _name: string;
  private readonly _description: string;

  protected constructor(code: string, name: string, description: string) {
    this._code = code;
    this._name = name;
    this._description = description;
  }

  get code(): string {
    return this._code;
  }

  get name(): string {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  /**
   * Value Objects are compared by value, not identity.
   */
  equals(other: unknown): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (this === other) {
      return true;
    }
    if (!(other instanceof DomainCatalog)) {
      return false;
    }
    return this._code === other._code;
  }

  toString(): string {
    return `${this._name} (${this._code})`;
  }
}