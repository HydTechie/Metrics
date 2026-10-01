import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { createHmac, timingSafeEqual } from 'crypto';
import { Reflector } from '@nestjs/core';

export type Role = 'RECEPTIONIST' | 'ADMIN';
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const gql = GqlExecutionContext.create(context);
    const req = gql.getContext().req;
    const auth = req.headers.authorization as string | undefined;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required');
    const [head, body, signature, extra] = auth.slice(7).split('.');
    if (!head || !body || !signature || extra) throw new UnauthorizedException('Invalid token');
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 24) throw new UnauthorizedException('JWT validation is not configured');
    let header: any;
    try { header = JSON.parse(Buffer.from(head, 'base64url').toString()); } catch { throw new UnauthorizedException('Invalid token header'); }
    if (header.alg !== 'HS256' || header.typ !== 'JWT') throw new UnauthorizedException('Unsupported token algorithm');
    const expected = createHmac('sha256', secret).update(`${head}.${body}`).digest();
    let actual: Buffer;
    try { actual = Buffer.from(signature, 'base64url'); } catch { throw new UnauthorizedException('Invalid token'); }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new UnauthorizedException('Invalid token signature');
    try {
      const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
      if (claims.exp <= Math.floor(Date.now() / 1000) || !['RECEPTIONIST', 'ADMIN'].includes(claims.role) || !claims.sub) throw new Error();
      req.user = { sub: claims.sub, role: claims.role as Role };
    } catch { throw new UnauthorizedException('Expired or invalid token claims'); }
    const roles = this.reflector.getAllAndOverride<Role[]>('roles', [context.getHandler(), context.getClass()]);
    if (roles?.length && !roles.includes(req.user.role) && req.user.role !== 'ADMIN') throw new ForbiddenException('Insufficient role');
    return true;
  }
}
