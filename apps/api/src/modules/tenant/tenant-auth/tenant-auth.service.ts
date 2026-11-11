import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { tenantUsers, tenants } from '../../../db/schema';
import { forbidden, unauthorized } from '../../../common/errors';
import { JwtSigningService } from '../../auth/jwt-signing.service';
import { LoginRateLimiterService } from '../../auth/login-rate-limiter.service';

@Injectable()
export class TenantAuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly jwtSigning: JwtSigningService,
    private readonly rateLimiter: LoginRateLimiterService,
  ) {}

  async login(email: string, password: string, ip: string): Promise<string> {
    await this.rateLimiter.assertNotLocked('tenant', email, ip);

    const [user] = await this.db
      .select()
      .from(tenantUsers)
      .where(eq(tenantUsers.email, email.toLowerCase()))
      .limit(1);

    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !valid || user.status !== 'active') {
      await this.rateLimiter.recordFailure('tenant', email, ip);
      throw unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const [tenant] = await this.db
      .select({ status: tenants.status })
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);
    if (!tenant || tenant.status === 'suspended') {
      throw forbidden('TENANT_SUSPENDED', 'This tenant account is suspended');
    }

    await this.rateLimiter.clear('tenant', email, ip);
    await this.db
      .update(tenantUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(tenantUsers.id, user.id));

    return this.jwtSigning.signTenant(user.id, user.tenantId, user.role);
  }
}
