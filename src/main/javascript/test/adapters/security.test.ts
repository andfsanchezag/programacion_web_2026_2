import { describe, it, expect } from 'vitest';
import { JwtProvider } from '../../application/infrastructure/security/JwtProvider';
import { PasswordSecurityAdapter } from '../../application/infrastructure/security/PasswordSecurityAdapter';
import { JwtAuthMiddleware } from '../../application/infrastructure/security/JwtAuthMiddleware';
import { BusinessConfigurationAdapter } from '../../application/infrastructure/config/appConfig';
import { makeUser } from '../helpers';
import { SystemRole } from '../../application/domain/valueobjects/SystemRole';

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

  it('BusinessConfigurationAdapter expone umbral configurable (no hardcodeado)', () => {
    const cfg = new BusinessConfigurationAdapter(10000000, 24);
    expect(cfg.getTransferApprovalThreshold()).toBe(10000000);
    expect(cfg.getTransferApprovalExpirationHours()).toBe(24);
  });
});
