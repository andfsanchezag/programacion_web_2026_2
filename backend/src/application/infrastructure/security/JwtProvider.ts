import { createHmac, timingSafeEqual } from 'node:crypto';
import { User } from '../../domain/models/User';
import { SystemRole } from '../../domain/valueobjects/SystemRole';
import { UserStatus } from '../../domain/valueobjects/UserStatus';
import { JwtTokenServicePort } from '../../domain/ports/out/JwtTokenServicePort';

function b64urlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function b64urlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64').toString('utf8');
}

/** Claims JWT: userId, username(sub), role, email (sin password). */
export interface JwtClaims {
  userId: string; sub: string; role: string; email: string;
  identification: string; iat: number; exp: number;
}

/**
 * JwtProvider: generación/validación HMAC-SHA256 sin dependencias externas.
 * Implementa JwtTokenServicePort (dominio) y expone reconstrucción del User.
 */
export class JwtProvider implements JwtTokenServicePort {
  constructor(
    private readonly secret: string = process.env.JWT_SECRET ?? 'dev-secret-change-me',
    private readonly expiresInSec: number = Number(process.env.JWT_EXPIRES_IN ?? 3600),
  ) {}
  generate(user: User): string {
    const now = Math.floor(Date.now() / 1000);
    const claims: JwtClaims = { userId: user.userId, sub: user.username, role: user.role.code,
      email: user.email, identification: user.identification, iat: now, exp: now + this.expiresInSec };
    const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = b64urlEncode(JSON.stringify(claims));
    const sig = createHmac('sha256', this.secret).update(`${header}.${payload}`).digest('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    return `${header}.${payload}.${sig}`;
  }
  private claimsOf(token: string): JwtClaims | null {
    try {
      const [, payload] = token.split('.');
      if (!payload) return null;
      return JSON.parse(b64urlDecode(payload)) as JwtClaims;
    } catch { return null; }
  }
  isValid(token: string): boolean {
    try {
      const [h, p, s] = token.split('.');
      if (!h || !p || !s) return false;
      const expected = createHmac('sha256', this.secret).update(`${h}.${p}`).digest('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      const a = Buffer.from(s); const b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
      const claims = this.claimsOf(token);
      if (!claims) return false;
      return claims.exp > Math.floor(Date.now() / 1000);
    } catch { return false; }
  }
  extractUsername(token: string): string { return this.claimsOf(token)?.sub ?? ''; }
  extractRole(token: string): SystemRole | null {
    const code = this.claimsOf(token)?.role;
    if (!code) return null;
    try { return SystemRole.fromCode(code); } catch { return null; }
  }
  /** Reconstruye el User de dominio desde las claims (filtro de seguridad). */
  reconstructUser(token: string): User | null {
    const c = this.claimsOf(token);
    if (!c || !this.isValid(token)) return null;
    try {
      return new User(c.userId, c.identification, c.sub, c.email, '', '',
        SystemRole.fromCode(c.role), c.sub, 'jwt', UserStatus.ACTIVE, null);
    } catch { return null; }
  }
  static extractBearer(header: string | undefined): string | null {
    if (!header || !header.startsWith('Bearer ')) return null;
    return header.slice('Bearer '.length);
  }
}
