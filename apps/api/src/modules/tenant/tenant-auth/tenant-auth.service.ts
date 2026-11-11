import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { tenantUsers, tenants } from '../../../db/schema';
import { badRequest, forbidden, unauthorized } from '../../../common/errors';
import { JwtSigningService } from '../../auth/jwt-signing.service';
import { LoginRateLimiterService } from '../../auth/login-rate-limiter.service';
import { TenantUserTokensService } from './tenant-user-tokens.service';
import { EmailService } from '../../email/email.service';
import { ConfigService } from '@nestjs/config';

const PASSWORD_HASH_ROUNDS = 12;

@Injectable()
export class TenantAuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly jwtSigning: JwtSigningService,
    private readonly rateLimiter: LoginRateLimiterService,
    private readonly tokens: TenantUserTokensService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
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

  private webUrl(): string {
    return this.config.get<string>('TENANT_WEB_URL') || 'http://localhost:5174';
  }

  async acceptInvite(token: string, password: string): Promise<void> {
    const tenantUserId = await this.tokens.consume(token, 'invite');
    const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
    await this.db
      .update(tenantUsers)
      .set({ passwordHash, status: 'active' })
      .where(eq(tenantUsers.id, tenantUserId));
  }

  /** Always succeeds from the caller's point of view — doesn't reveal
   * whether the email matched an account, to avoid leaking which emails
   * are registered. */
  async forgotPassword(email: string): Promise<void> {
    const [user] = await this.db
      .select({ id: tenantUsers.id })
      .from(tenantUsers)
      .where(eq(tenantUsers.email, email.toLowerCase()))
      .limit(1);
    if (!user) return;

    const token = await this.tokens.issuePasswordReset(user.id);
    const resetUrl = `${this.webUrl()}/outreach/reset-password?token=${token}`;
    await this.email.sendPasswordReset(email.toLowerCase(), resetUrl);
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const tenantUserId = await this.tokens.consume(token, 'password_reset');
    const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
    await this.db.update(tenantUsers).set({ passwordHash }).where(eq(tenantUsers.id, tenantUserId));
  }

  async changePassword(tenantUserId: string, currentPassword: string, newPassword: string): Promise<void> {
    const [user] = await this.db
      .select({ passwordHash: tenantUsers.passwordHash })
      .from(tenantUsers)
      .where(eq(tenantUsers.id, tenantUserId))
      .limit(1);
    const valid = user ? await bcrypt.compare(currentPassword, user.passwordHash) : false;
    if (!valid) throw badRequest('INVALID_CURRENT_PASSWORD', 'Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, PASSWORD_HASH_ROUNDS);
    await this.db.update(tenantUsers).set({ passwordHash }).where(eq(tenantUsers.id, tenantUserId));
  }
}
