import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { tenants } from '../../../db/schema';
import { JwtSigningService } from '../jwt-signing.service';
import { TENANT_COOKIE, readCookie } from '../session-cookie';
import { forbidden, unauthorized } from '../../../common/errors';
import type { ActorRequest } from '../current-actor.decorator';

@Injectable()
export class TenantAuthGuard implements CanActivate {
  constructor(
    private readonly jwtSigning: JwtSigningService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ActorRequest>();
    const token = readCookie(req, TENANT_COOKIE);
    if (!token) {
      throw unauthorized('TENANT_AUTH_REQUIRED', 'Tenant session required');
    }
    const payload = this.jwtSigning.verifyTenant(token);

    // Re-checked every request (not just at login) so a suspended tenant's
    // still-valid JWTs stop working immediately.
    const [tenant] = await this.db
      .select({ status: tenants.status })
      .from(tenants)
      .where(eq(tenants.id, payload.tenantId))
      .limit(1);
    if (!tenant || tenant.status === 'suspended') {
      throw forbidden('TENANT_SUSPENDED', 'This tenant account is suspended');
    }

    req.actor = {
      kind: 'tenant',
      tenantUserId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
    };
    return true;
  }
}
