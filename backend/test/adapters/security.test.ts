import { describe, it, expect } from 'vitest';
import { JwtProvider } from '../../src/application/infrastructure/security/JwtProvider';
import { PasswordSecurityAdapter } from '../../src/application/infrastructure/security/PasswordSecurityAdapter';
import { JwtAuthMiddleware } from '../../src/application/infrastructure/security/JwtAuthMiddleware';
import { BusinessConfigurationAdapter } from '../../src/application/infrastructure/config/appConfig';
import { makeUser } from '../helpers';
import { SystemRole } from '../../src/application/domain/valueobjects/SystemRole';

describe('Security + Config (Fase 4)', () => {
  it('JwtProvider genera/valida y reconstruye el User sin password en claims', () => {
    const jwt = new JwtProvider('test-secret-123', 3600);
    const user = makeUser(SystemRole.NATURAL_CUSTOMER);
    const token = jwt.generate(user);
    expect(token.split('.')).toHaveLength(3);
    expect(jwt.isValid(token)).toBe(true);
    expect(jwt.extractUsername(token)).toBe(user.username);
    expect(jwt.extractRole(token)?.code).toBe('NATURAL_CUSTOMER');
    const rebuilt = jwt.reconstructUser(token);
    expect(rebuilt?.username).toBe(user.username);
    expect(rebuilt?.role.code).toBe(user.role.code);
    expect(token).not.toContain(user.passwordHash);
    expect(jwt.isValid(token + 'tampered')).toBe(false);
  });

  it('PasswordSecurityAdapter hashea y verifica (scrypt)', () => {
    const pw = new PasswordSecurityAdapter();
    const hash = pw.encode('StrongPassword123!');
    expect(hash).not.toContain('StrongPassword123!');
    expect(pw.matches('StrongPassword123!', hash)).toBe(true);
    expect(pw.matches('wrong', hash)).toBe(false);
  });

  it('JwtAuthMiddleware autentica Bearer y autoriza por rol', () => {
    const jwt = new JwtProvider('test-secret-123', 3600);
    const mw = new JwtAuthMiddleware(jwt);
    const user = makeUser(SystemRole.TELLER_EMPLOYEE);
    const token = jwt.generate(user);
    const req: { headers: Record<string, string | undefined>; user?: unknown } = {
      headers: { authorization: `Bearer ${token}` },
    };
    const authed = mw.authenticate(req as never);
    expect((authed as { username: string }).username).toBe(user.username);
    expect(() => mw.authorize(authed, SystemRole.TELLER_EMPLOYEE)).not.toThrow();
    expect(() => mw.authorize(authed, SystemRole.INTERNAL_ANALYST)).toThrow();
    expect(() => mw.authenticate({ headers: {} } as never)).toThrow();
  });

  it('JwtProvider: tokens inválidos, roles desconocidos y expiración', () => {
    const jwt = new JwtProvider('test-secret-123', 3600);
    expect(jwt.extractUsername('not-a-token')).toBe('');
    expect(jwt.extractRole('not-a-token')).toBeNull();
    expect(jwt.reconstructUser('not-a-token')).toBeNull();
    expect(JwtProvider.extractBearer(undefined)).toBeNull();
    expect(JwtProvider.extractBearer('Token abc')).toBeNull();
    expect(JwtProvider.extractBearer('Bearer abc.def')).toBe('abc.def');
    // Rol inexistente en claims firmadas: extractRole null.
    const user = makeUser(SystemRole.NATURAL_CUSTOMER);
    const [h, p, s] = jwt.generate(user).split('.');
    const payload = JSON.parse(Buffer.from(p, 'base64').toString('utf8'));
    payload.role = 'NOPE';
    const forged = `${h}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${s}`;
    expect(jwt.extractRole(forged)).toBeNull();
    expect(jwt.isValid('a.!!!.b')).toBe(false);
    expect(jwt.isValid('a.!!!!.b')).toBe(false);
    // Expirado.
    const expired = new JwtProvider('test-secret-123', -10);
    expect(expired.isValid(expired.generate(user))).toBe(false);
  });

  it('PasswordSecurityAdapter: formatos inválidos no coinciden', () => {
    const pw = new PasswordSecurityAdapter();
    expect(pw.matches('x', 'no-dollars')).toBe(false);
    expect(pw.matches('x', 'scrypt$onlysalt')).toBe(false);
    expect(pw.matches('x', 'scrypt$zz$zz')).toBe(false);
  });

  it('BusinessConfigurationAdapter y JwtProvider usan valores por defecto sin entorno', () => {
    const prev = { ...process.env };
    delete process.env.TRANSFER_APPROVAL_THRESHOLD;
    delete process.env.TRANSFER_APPROVAL_EXPIRATION_HOURS;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;
    try {
      const cfg = new BusinessConfigurationAdapter();
      expect(cfg.getTransferApprovalThreshold()).toBe(10000000);
      expect(cfg.getTransferApprovalExpirationHours()).toBe(24);
      const jwt = new JwtProvider();
      const token = jwt.generate(makeUser(SystemRole.NATURAL_CUSTOMER));
      expect(jwt.isValid(token)).toBe(true);
    } finally {
      process.env = prev;
    }
  });

  it('BusinessConfigurationAdapter usa variables de entorno', () => {
    const prevT = process.env.TRANSFER_APPROVAL_THRESHOLD;
    const prevH = process.env.TRANSFER_APPROVAL_EXPIRATION_HOURS;
    process.env.TRANSFER_APPROVAL_THRESHOLD = '5000';
    process.env.TRANSFER_APPROVAL_EXPIRATION_HOURS = '48';
    try {
      const cfg = new BusinessConfigurationAdapter();
      expect(cfg.getTransferApprovalThreshold()).toBe(5000);
      expect(cfg.getTransferApprovalExpirationHours()).toBe(48);
    } finally {
      if (prevT === undefined) delete process.env.TRANSFER_APPROVAL_THRESHOLD;
      else process.env.TRANSFER_APPROVAL_THRESHOLD = prevT;
      if (prevH === undefined) delete process.env.TRANSFER_APPROVAL_EXPIRATION_HOURS;
      else process.env.TRANSFER_APPROVAL_EXPIRATION_HOURS = prevH;
    }
  });

  it('JwtProvider: firma válida pero claims corruptas no reconstruyen', async () => {
    const { createHmac } = await import('node:crypto');
    const jwt = new JwtProvider('test-secret-123', 3600);
    expect(jwt.isValid('a.b')).toBe(false);
    const badSig = jwt.generate(makeUser(SystemRole.NATURAL_CUSTOMER));
    const [h, p, s] = badSig.split('.');
    const flipped = s.slice(0, -1) + (s.endsWith('A') ? 'B' : 'A');
    expect(jwt.isValid(`${h}.${p}.${flipped}`)).toBe(false);
    const b64u = (v: string) => Buffer.from(v).toString('base64url');
    const hh = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const pp = b64u(JSON.stringify({ userId: 'u', sub: 'u', role: 123, email: '', identification: 'i', iat: 1, exp: 9999999999 }));
    const sig = createHmac('sha256', 'test-secret-123').update(`${hh}.${pp}`).digest('base64url');
    expect(jwt.reconstructUser(`${hh}.${pp}.${sig}`)).toBeNull();
  });

  it('BusinessConfigurationAdapter expone umbral configurable (no hardcodeado)', () => {
    const cfg = new BusinessConfigurationAdapter(10000000, 24);
    expect(cfg.getTransferApprovalThreshold()).toBe(10000000);
    expect(cfg.getTransferApprovalExpirationHours()).toBe(24);
  });
});
