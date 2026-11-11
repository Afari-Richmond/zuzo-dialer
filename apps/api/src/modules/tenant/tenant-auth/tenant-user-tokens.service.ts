import { createHash, randomBytes } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { tenantUserTokens } from '../../../db/schema';
import { badRequest } from '../../../common/errors';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class TenantUserTokensService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private async issue(
    tenantUserId: string,
    purpose: 'invite' | 'password_reset',
    ttlMs: number,
  ): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.db.insert(tenantUserTokens).values({
      tenantUserId,
      tokenHash: hashToken(token),
      purpose,
      expiresAt: new Date(Date.now() + ttlMs),
    });
    return token;
  }

  issueInvite(tenantUserId: string): Promise<string> {
    return this.issue(tenantUserId, 'invite', INVITE_TTL_MS);
  }

  issuePasswordReset(tenantUserId: string): Promise<string> {
    return this.issue(tenantUserId, 'password_reset', RESET_TTL_MS);
  }

  /** Verifies the token is valid, unexpired, and unused, and marks it used.
   * Throws on any failure — callers don't need to distinguish the reason. */
  async consume(token: string, purpose: 'invite' | 'password_reset'): Promise<string> {
    const tokenHash = hashToken(token);
    const [row] = await this.db
      .select()
      .from(tenantUserTokens)
      .where(
        and(
          eq(tenantUserTokens.tokenHash, tokenHash),
          eq(tenantUserTokens.purpose, purpose),
          isNull(tenantUserTokens.usedAt),
          gt(tenantUserTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!row) throw badRequest('INVALID_TOKEN', 'This link is invalid or has expired');

    await this.db
      .update(tenantUserTokens)
      .set({ usedAt: new Date() })
      .where(eq(tenantUserTokens.id, row.id));
    return row.tenantUserId;
  }
}
