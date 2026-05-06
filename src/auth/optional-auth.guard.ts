import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { COOKIE_NAME } from './jwt-auth.guard';

/** Anexa userId em req se cookie válido, mas nunca bloqueia. */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { userId?: string }>();
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
        req.userId = payload.sub;
      } catch {
        /* ignore */
      }
    }
    return true;
  }
}
