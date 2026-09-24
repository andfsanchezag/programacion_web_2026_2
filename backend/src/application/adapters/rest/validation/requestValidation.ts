/**
 * Validación central de DTOs de entrada (contrato SDD/Adapters/Rest-validation.md).
 * Funciones puras sin frameworks: verifican presencia, tipos, formatos, límites,
 * montos y fechas ANTES de construir modelos de dominio. Lanza
 * InvalidRequestException (400 INVALID_REQUEST) ante cualquier incumplimiento.
 */
export class InvalidRequestException extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = 'InvalidRequestException';
    this.field = field;
  }
}

interface StringOpts {
  optional?: boolean;
  min?: number;
  max?: number;
}

/** Cadena requerida/opcional con longitud controlada (sin coerción de tipos). */
export function reqString(value: unknown, field: string, opts: StringOpts = {}): string | undefined {
  const { optional = false, min = 1, max = 200 } = opts;
  if (value === undefined || value === null) {
    if (optional) return undefined;
    throw new InvalidRequestException(field, 'is required');
  }
  if (typeof value !== 'string') {
    throw new InvalidRequestException(field, 'must be a string');
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw new InvalidRequestException(field, `must not be blank (min ${min} chars)`);
  }
  if (trimmed.length > max) {
    throw new InvalidRequestException(field, `exceeds max length ${max}`);
  }
  return value;
}

export function reqEmail(value: unknown, field: string, opts: StringOpts = {}): string | undefined {
  const v = reqString(value, field, { max: 160, ...opts });
  if (v !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    throw new InvalidRequestException(field, 'must be a valid email');
  }
  return v;
}

export function reqPhone(value: unknown, field: string, opts: StringOpts = {}): string | undefined {
  const v = reqString(value, field, { max: 20, ...opts });
  if (v !== undefined && !/^\+?\d{7,15}$/.test(v.trim())) {
    throw new InvalidRequestException(field, 'must contain 7-15 digits');
  }
  return v;
}

interface DateOpts {
  optional?: boolean;
  past?: boolean;
}

/** Fecha ISO-8601 válida; opcionalmente exige que esté en el pasado. */
export function reqDate(value: unknown, field: string, opts: DateOpts = {}): string | undefined {
  const v = reqString(value, field, { optional: opts.optional, max: 40 });
  if (v === undefined) return undefined;
  const time = Date.parse(v);
  if (Number.isNaN(time)) {
    throw new InvalidRequestException(field, 'must be a valid ISO-8601 date');
  }
  if (opts.past && time >= Date.now()) {
    throw new InvalidRequestException(field, 'must be in the past');
  }
  return v;
}

interface NumberOpts {
  optional?: boolean;
  min?: number;
  integer?: boolean;
}

/** Número finito sin coerción de strings; opcionalmente mínimo y/o entero. */
export function reqNumber(value: unknown, field: string, opts: NumberOpts = {}): number | undefined {
  const { optional = false, min, integer = false } = opts;
  if (value === undefined || value === null) {
    if (optional) return undefined;
    throw new InvalidRequestException(field, 'is required');
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new InvalidRequestException(field, 'must be a number');
  }
  if (integer && !Number.isInteger(value)) {
    throw new InvalidRequestException(field, 'must be an integer');
  }
  if (min !== undefined && value < min) {
    throw new InvalidRequestException(field, `must be >= ${min}`);
  }
  return value;
}
