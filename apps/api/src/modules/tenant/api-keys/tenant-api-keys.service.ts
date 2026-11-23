import { createHash, randomBytes } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { tenantApiKeys } from '../../../db/schema';

const KEY_PREFIX_LENGTH = 8;

function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

/** One active key per tenant, for their own backend systems to call our API
 * directly (e.g. a delivery-tracking service triggering a notification call)
 * — a different trust boundary from the browser session cookie the
 * dashboard itself uses. Same "shown once, never stored in the clear, never
 * retrievable again" model as LiveHub's own API clients. */
@Injectable()
export class TenantApiKeysService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async getStatus(tenantId: string) {
    const [row] = await this.db
      .select({ keyPrefix: tenantApiKeys.keyPrefix, createdAt: tenantApiKeys.createdAt, lastUsedAt: tenantApiKeys.lastUsedAt })
      .from(tenantApiKeys)
      .where(eq(tenantApiKeys.tenantId, tenantId))
      .limit(1);
    return { hasKey: !!row, keyPrefix: row?.keyPrefix ?? null, createdAt: row?.createdAt ?? null, lastUsedAt: row?.lastUsedAt ?? null };
  }

  /** Replaces any existing key. The raw value is returned once and never
   * persisted — only its hash and a short prefix are stored. */
  async generate(tenantId: string, createdBy: string): Promise<string> {
    const rawKey = `zvx_${randomBytes(24).toString('base64url')}`;
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, KEY_PREFIX_LENGTH);

    await this.db
      .insert(tenantApiKeys)
      .values({ tenantId, keyHash, keyPrefix, createdBy })
      .onConflictDoUpdate({
        target: tenantApiKeys.tenantId,
        set: { keyHash, keyPrefix, createdBy, createdAt: new Date(), lastUsedAt: null },
      });

    return rawKey;
  }

  /** Resolves a raw API key to the tenant it belongs to, or null. Touches
   * lastUsedAt so a platform admin can see whether a key is actually in use. */
  async verify(rawKey: string): Promise<string | null> {
    const keyHash = hashKey(rawKey);
    const [row] = await this.db
      .select({ tenantId: tenantApiKeys.tenantId })
      .from(tenantApiKeys)
      .where(eq(tenantApiKeys.keyHash, keyHash))
      .limit(1);
    if (!row) return null;

    await this.db
      .update(tenantApiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(tenantApiKeys.keyHash, keyHash));

    return row.tenantId;
  }
}
