import { Inject, Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../db/database.module';
import type { Database } from '../../db/client';
import { tenantTelephonyCredentials } from '../../db/schema';
import { badRequest, serviceUnavailable } from '../../common/errors';
import { CredentialsCryptoService } from './credentials-crypto.service';
import { StubAdapter } from './adapters/stub.adapter';
import { TwilioAdapter } from './adapters/twilio.adapter';
import { AfricaTalkingAdapter } from './adapters/africastalking.adapter';
import { LiveHubAdapter } from './adapters/livehub.adapter';
import type { VoiceProviderAdapter } from './adapters/voice-provider.adapter';
import type {
  AfricaTalkingCredentials,
  LiveHubCredentials,
  TwilioCredentials,
} from './adapters/credentials.types';

const CACHE_MAX = 500;
const CACHE_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class VoiceAdapterFactoryService {
  private readonly cache = new LRUCache<string, VoiceProviderAdapter>({
    max: CACHE_MAX,
    ttl: CACHE_TTL_MS,
  });

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly crypto: CredentialsCryptoService,
  ) {}

  invalidate(tenantId: string): void {
    this.cache.delete(tenantId);
  }

  /** Campaign management (create/list/update/lock/delete campaigns, target
   * list, post-call analysis) is LiveHub-specific — no other provider has an
   * equivalent concept — so callers that need it ask for the concrete class
   * and get a clear error if the tenant isn't configured for LiveHub. */
  async getLiveHubAdapterForTenant(tenantId: string): Promise<LiveHubAdapter> {
    const adapter = await this.getAdapterForTenant(tenantId);
    if (!(adapter instanceof LiveHubAdapter)) {
      throw badRequest(
        'LIVEHUB_NOT_CONFIGURED',
        'Campaign management requires this tenant\'s active telephony credential to be LiveHub',
      );
    }
    return adapter;
  }

  async getAdapterForTenant(tenantId: string): Promise<VoiceProviderAdapter> {
    const cached = this.cache.get(tenantId);
    if (cached) return cached;

    const [row] = await this.db
      .select()
      .from(tenantTelephonyCredentials)
      .where(
        and(
          eq(tenantTelephonyCredentials.tenantId, tenantId),
          eq(tenantTelephonyCredentials.isActive, true),
        ),
      )
      .limit(1);

    if (!row) {
      const adapter = new StubAdapter();
      this.cache.set(tenantId, adapter);
      return adapter;
    }

    if (row.provider === 'stub' || !row.iv || !row.authTag || !row.ciphertext) {
      const adapter = new StubAdapter();
      this.cache.set(tenantId, adapter);
      return adapter;
    }

    const plaintext = this.crypto.decrypt({
      iv: row.iv,
      authTag: row.authTag,
      ciphertext: row.ciphertext,
    });
    const credentials = JSON.parse(plaintext) as Record<string, unknown>;

    const adapter = this.buildAdapter(row.provider, credentials);
    this.cache.set(tenantId, adapter);
    return adapter;
  }

  private buildAdapter(
    provider: string,
    credentials: Record<string, unknown>,
  ): VoiceProviderAdapter {
    switch (provider) {
      case 'twilio':
        return new TwilioAdapter(credentials as unknown as TwilioCredentials);
      case 'africastalking':
        return new AfricaTalkingAdapter(credentials as unknown as AfricaTalkingCredentials);
      case 'livehub':
        return new LiveHubAdapter(credentials as unknown as LiveHubCredentials);
      case 'stub':
        return new StubAdapter();
      default:
        throw serviceUnavailable('UNKNOWN_TELEPHONY_PROVIDER', `Unknown provider: ${provider}`);
    }
  }
}
