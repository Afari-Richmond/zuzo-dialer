import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { platformAdmins } from '../../../db/schema';
import { unauthorized } from '../../../common/errors';
import { JwtSigningService } from '../../auth/jwt-signing.service';
import { LoginRateLimiterService } from '../../auth/login-rate-limiter.service';

@Injectable()
export class PlatformAuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly jwtSigning: JwtSigningService,
    private readonly rateLimiter: LoginRateLimiterService,
  ) {}

  async login(email: string, password: string, ip: string): Promise<string> {
    await this.rateLimiter.assertNotLocked('platform', email, ip);

    const [admin] = await this.db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.email, email.toLowerCase()))
      .limit(1);

    const valid = admin ? await bcrypt.compare(password, admin.passwordHash) : false;
    if (!admin || !valid || admin.status === 'suspended') {
      await this.rateLimiter.recordFailure('platform', email, ip);
      throw unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    await this.rateLimiter.clear('platform', email, ip);
    await this.db
      .update(platformAdmins)
      .set({ lastLoginAt: new Date() })
      .where(eq(platformAdmins.id, admin.id));

    return this.jwtSigning.signPlatform(admin.id);
  }
}
