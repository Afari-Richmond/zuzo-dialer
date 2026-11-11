import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { unauthorized } from '../../common/errors';
import type { PlatformJwtPayload, TenantJwtPayload } from './jwt-types';

export const SESSION_TTL_SECONDS = 12 * 60 * 60;

@Injectable()
export class JwtSigningService {
  constructor(private readonly jwt: JwtService) {}

  signPlatform(platformAdminId: string): string {
    const payload: PlatformJwtPayload = {
      typ: 'platform',
      sub: platformAdminId,
      role: 'platform_admin',
    };
    return this.jwt.sign(payload, { expiresIn: SESSION_TTL_SECONDS });
  }

  signTenant(
    tenantUserId: string,
    tenantId: string,
    role: 'tenant_admin' | 'agent',
  ): string {
    const payload: TenantJwtPayload = {
      typ: 'tenant',
      sub: tenantUserId,
      tenantId,
      role,
    };
    return this.jwt.sign(payload, { expiresIn: SESSION_TTL_SECONDS });
  }

  verifyPlatform(token: string): PlatformJwtPayload {
    const payload = this.verifyRaw(token);
    if (payload.typ !== 'platform') {
      throw unauthorized('INVALID_PLATFORM_SESSION', 'Not a platform session');
    }
    return payload;
  }

  verifyTenant(token: string): TenantJwtPayload {
    const payload = this.verifyRaw(token);
    if (payload.typ !== 'tenant') {
      throw unauthorized('INVALID_TENANT_SESSION', 'Not a tenant session');
    }
    return payload;
  }

  private verifyRaw(token: string): PlatformJwtPayload | TenantJwtPayload {
    try {
      return this.jwt.verify(token);
    } catch {
      throw unauthorized('INVALID_SESSION', 'Session token is invalid or expired');
    }
  }
}
