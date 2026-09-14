import { User } from '../../domain/models/User';
import { SystemRole } from '../../domain/valueobjects/SystemRole';
import { JwtProvider } from './JwtProvider';

/** Filtro/middleware de autenticación: Bearer JWT → User de dominio. Framework-agnóstico. */
export interface HttpLikeRequest {
  headers: Record<string, string | undefined>;
  user?: User;
}

export class JwtAuthMiddleware {
  constructor(private readonly jwt: JwtProvider = new JwtProvider()) {}
  /** Valida el header Authorization y reconstruye el User; lanza 401 si falla. */
  authenticate(req: HttpLikeRequest): User {
    const token = JwtProvider.extractBearer(req.headers['authorization'] ?? req.headers['Authorization']);
    if (!token) throw Object.assign(new Error('Missing bearer token'), { status: 401 });
    const user = this.jwt.reconstructUser(token);
    if (!user) throw Object.assign(new Error('Invalid or expired token'), { status: 401 });
    req.user = user;
    return user;
  }
  /** Autoriza que el rol del User esté entre los permitidos (rutas por rol SDD). */
  authorize(user: User, ...allowed: SystemRole[]): void {
    if (!allowed.some((r) => r.equals(user.role))) {
      throw Object.assign(new Error(`Forbidden for role ${user.role.code}`), { status: 403 });
    }
  }
}
