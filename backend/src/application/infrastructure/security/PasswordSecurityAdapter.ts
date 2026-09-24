import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { PasswordServicePort } from '../../domain/ports/out/PasswordServicePort';

/** PasswordSecurityAdapter: hash scrypt + salt (sin dependencias externas). */
export class PasswordSecurityAdapter implements PasswordServicePort {
  encode(rawPassword: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(rawPassword, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
  }
  matches(rawPassword: string, encodedPassword: string): boolean {
    try {
      const [, salt, hash] = encodedPassword.split('$');
      if (!salt || !hash) return false;
      const derived = scryptSync(rawPassword, salt, 64);
      const expected = Buffer.from(hash, 'hex');
      return derived.length === expected.length && timingSafeEqual(derived, expected);
    } catch { return false; }
  }
}
