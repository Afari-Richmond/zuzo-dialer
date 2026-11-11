import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule, DRIZZLE } from '../../db/database.module';
import type { Database } from '../../db/client';
import { tenants, tenantTelephonyCredentials } from '../../db/schema';
import { CredentialsCryptoService } from './credentials-crypto.service';
import { VoiceAdapterFactoryService } from './voice-adapter-factory.service';
import { StubAdapter } from './adapters/stub.adapter';
import { LiveHubAdapter } from './adapters/livehub.adapter';

describe('VoiceAdapterFactoryService', () => {
  let db: Database;
  let crypto: CredentialsCryptoService;
  let factory: VoiceAdapterFactoryService;
  let tenantA: { id: string };
  let tenantB: { id: string };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule],
      providers: [CredentialsCryptoService, VoiceAdapterFactoryService],
    }).compile();

    db = moduleRef.get(DRIZZLE);
    crypto = moduleRef.get(CredentialsCryptoService);
    factory = moduleRef.get(VoiceAdapterFactoryService);

    const suffix = Date.now();
    [tenantA] = await db
      .insert(tenants)
      .values({ name: `Adapter Test A ${suffix}`, slug: `adapter-a-${suffix}` })
      .returning({ id: tenants.id });
    [tenantB] = await db
      .insert(tenants)
      .values({ name: `Adapter Test B ${suffix}`, slug: `adapter-b-${suffix}` })
      .returning({ id: tenants.id });

    for (const [tenantId, clientId] of [
      [tenantA.id, 'client-a'],
      [tenantB.id, 'client-b'],
    ] as const) {
      const encrypted = crypto.encrypt(
        JSON.stringify({ clientId, clientSecret: 'secret', outreachBotId: 'bot-1' }),
      );
      await db.insert(tenantTelephonyCredentials).values({
        tenantId,
        provider: 'livehub',
        label: 'Primary',
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        ciphertext: encrypted.ciphertext,
        isActive: true,
      });
    }
  });

  afterAll(async () => {
    await db.delete(tenants).where(eq(tenants.id, tenantA.id));
    await db.delete(tenants).where(eq(tenants.id, tenantB.id));
  });

  it('builds a distinct adapter instance per tenant from that tenant\'s own credentials', async () => {
    const adapterA = await factory.getAdapterForTenant(tenantA.id);
    const adapterB = await factory.getAdapterForTenant(tenantB.id);

    expect(adapterA).toBeInstanceOf(LiveHubAdapter);
    expect(adapterB).toBeInstanceOf(LiveHubAdapter);
    // Different instances => each owns its own private tokenCache field —
    // no cross-tenant OAuth-token leakage is even structurally possible.
    expect(adapterA).not.toBe(adapterB);
  });

  it('caches the adapter instance per tenant until invalidated', async () => {
    const first = await factory.getAdapterForTenant(tenantA.id);
    const second = await factory.getAdapterForTenant(tenantA.id);
    expect(first).toBe(second);

    factory.invalidate(tenantA.id);
    const third = await factory.getAdapterForTenant(tenantA.id);
    expect(third).not.toBe(first);
  });

  it('falls back to StubAdapter for a tenant with no active credentials', async () => {
    const suffix = Date.now();
    const [bareTenant] = await db
      .insert(tenants)
      .values({ name: `Adapter Test Bare ${suffix}`, slug: `adapter-bare-${suffix}` })
      .returning({ id: tenants.id });

    const adapter = await factory.getAdapterForTenant(bareTenant.id);
    expect(adapter).toBeInstanceOf(StubAdapter);

    await db.delete(tenants).where(eq(tenants.id, bareTenant.id));
  });
});
