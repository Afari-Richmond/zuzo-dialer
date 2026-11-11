import { createHash } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../db/database.module';
import type { Database } from '../../db/client';
import { authLoginFailures } from '../../db/schema';
import { tooManyRequests } from '../../common/errors';

const MAX_FAILURES = 8;
const WINDOW_MS = 15 * 60 * 1000;

@Injectable()
export class LoginRateLimiterService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private hash(scope: 'platform' | 'tenant', email: string, ip: string): string {
    return createHash('sha256').update(`${scope}:${email.toLowerCase()}:${ip}`).digest('hex');
  }

  async assertNotLocked(
    scope: 'platform' | 'tenant',
    email: string,
    ip: string,
  ): Promise<void> {
    const identifierHash = this.hash(scope, email, ip);
    const [row] = await this.db
      .select()
      .from(authLoginFailures)
      .where(
        and(
          eq(authLoginFailures.scopeType, scope),
          eq(authLoginFailures.identifierHash, identifierHash),
        ),
      )
      .limit(1);
    if (!row) return;
    if (row.windowResetAt <= new Date()) return; // window expired, treat as clear
    if (row.failureCount >= MAX_FAILURES) {
      throw tooManyRequests(
        `${scope.toUpperCase()}_LOGIN_RATE_LIMITED`,
        'Too many failed login attempts — try again later',
      );
    }
  }

  async recordFailure(scope: 'platform' | 'tenant', email: string, ip: string): Promise<void> {
    const identifierHash = this.hash(scope, email, ip);
    const now = new Date();
    const [existing] = await this.db
      .select()
      .from(authLoginFailures)
      .where(
        and(
          eq(authLoginFailures.scopeType, scope),
          eq(authLoginFailures.identifierHash, identifierHash),
        ),
      )
      .limit(1);

    if (!existing || existing.windowResetAt <= now) {
      await this.db
        .insert(authLoginFailures)
        .values({
          scopeType: scope,
          identifierHash,
          failureCount: 1,
          windowResetAt: new Date(now.getTime() + WINDOW_MS),
        })
        .onConflictDoUpdate({
          target: [authLoginFailures.scopeType, authLoginFailures.identifierHash],
          set: { failureCount: 1, windowResetAt: new Date(now.getTime() + WINDOW_MS) },
        });
      return;
    }

    await this.db
      .update(authLoginFailures)
      .set({ failureCount: existing.failureCount + 1 })
      .where(eq(authLoginFailures.id, existing.id));
  }

  async clear(scope: 'platform' | 'tenant', email: string, ip: string): Promise<void> {
    const identifierHash = this.hash(scope, email, ip);
    await this.db
      .delete(authLoginFailures)
      .where(
        and(
          eq(authLoginFailures.scopeType, scope),
          eq(authLoginFailures.identifierHash, identifierHash),
        ),
      );
  }
}
