import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtSigningService } from '../jwt-signing.service';
import { PLATFORM_COOKIE, readCookie } from '../session-cookie';
import { unauthorized } from '../../../common/errors';
import type { ActorRequest } from '../current-actor.decorator';

@Injectable()
export class PlatformAuthGuard implements CanActivate {
  constructor(private readonly jwtSigning: JwtSigningService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<ActorRequest>();
    const token = readCookie(req, PLATFORM_COOKIE);
    if (!token) {
      throw unauthorized('PLATFORM_AUTH_REQUIRED', 'Platform admin session required');
    }
    const payload = this.jwtSigning.verifyPlatform(token);
    req.actor = { kind: 'platform', platformAdminId: payload.sub };
    return true;
  }
}
