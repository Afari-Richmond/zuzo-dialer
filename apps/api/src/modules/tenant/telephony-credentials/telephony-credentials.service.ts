import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { tenantTelephonyCredentials } from '../../../db/schema';
import { badRequest, notFound } from '../../../common/errors';
import { tenantWhere } from '../../../common/tenant-scope';
import { CredentialsCryptoService } from '../../voice/credentials-crypto.service';
import { VoiceAdapterFactoryService } from '../../voice/voice-adapter-factory.service';
import { REQUIRED_CREDENTIAL_FIELDS } from '../../voice/adapters/credentials.types';
import type { UpsertTelephonyCredentialDto } from './dto/telephony-credential.dto';

const METADATA_COLUMNS = {
  id: tenantTelephonyCredentials.id,
  provider: tenantTelephonyCredentials.provider,
  label: tenantTelephonyCredentials.label,
  isActive: tenantTelephonyCredentials.isActive,
  createdAt: tenantTelephonyCredentials.createdAt,
  updatedAt: tenantTelephonyCredentials.updatedAt,
};

@Injectable()
export class TelephonyCredentialsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly crypto: CredentialsCryptoService,
    private readonly adapterFactory: VoiceAdapterFactoryService,
  ) {}

  list(tenantId: string) {
    return this.db
      .select(METADATA_COLUMNS)
      .from(tenantTelephonyCredentials)
      .where(tenantWhere(tenantTelephonyCredentials.tenantId, tenantId));
  }

  async upsert(tenantId: string, dto: UpsertTelephonyCredentialDto, actorUserId: string) {
    const required = REQUIRED_CREDENTIAL_FIELDS[dto.provider];
    const missing = required.filter((field) => !dto.credentials[field]?.trim());
    if (missing.length > 0) {
      throw badRequest(
        'MISSING_CREDENTIAL_FIELDS',
        `${dto.provider} credentials are missing: ${missing.join(', ')}`,
      );
    }

    const encrypted =
      dto.provider === 'stub' ? null : this.crypto.encrypt(JSON.stringify(dto.credentials));

    const [row] = await this.db.transaction(async (tx) => {
      await tx
        .update(tenantTelephonyCredentials)
        .set({ isActive: false })
        .where(tenantWhere(tenantTelephonyCredentials.tenantId, tenantId));

      return tx
        .insert(tenantTelephonyCredentials)
        .values({
          tenantId,
          provider: dto.provider,
          label: dto.label,
          iv: encrypted?.iv ?? null,
          authTag: encrypted?.authTag ?? null,
          ciphertext: encrypted?.ciphertext ?? null,
          isActive: true,
          createdBy: actorUserId,
        })
        .returning(METADATA_COLUMNS);
    });

    this.adapterFactory.invalidate(tenantId);
    return row;
  }

  async deactivate(tenantId: string, id: string) {
    const [existing] = await this.db
      .select({ id: tenantTelephonyCredentials.id })
      .from(tenantTelephonyCredentials)
      .where(
        and(
          tenantWhere(tenantTelephonyCredentials.tenantId, tenantId),
          eq(tenantTelephonyCredentials.id, id),
        ),
      )
      .limit(1);
    if (!existing) throw notFound('CREDENTIAL_NOT_FOUND', 'Telephony credential not found');

    await this.db
      .update(tenantTelephonyCredentials)
      .set({ isActive: false })
      .where(eq(tenantTelephonyCredentials.id, id));
    this.adapterFactory.invalidate(tenantId);
    return { ok: true };
  }
}
