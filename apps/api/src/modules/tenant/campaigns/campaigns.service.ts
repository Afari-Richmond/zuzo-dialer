import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { campaignTargets, campaigns, tenantTelephonyCredentials } from '../../../db/schema';
import { badRequest, notFound } from '../../../common/errors';
import { tenantWhere } from '../../../common/tenant-scope';
import type { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  list(tenantId: string) {
    return this.db.select().from(campaigns).where(tenantWhere(campaigns.tenantId, tenantId));
  }

  async get(tenantId: string, id: string) {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(and(tenantWhere(campaigns.tenantId, tenantId), eq(campaigns.id, id)))
      .limit(1);
    if (!campaign) throw notFound('CAMPAIGN_NOT_FOUND', 'Campaign not found');
    return campaign;
  }

  async getStats(tenantId: string, id: string) {
    await this.get(tenantId, id);
    const [counts] = await this.db
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
        queued: sql<number>`count(*) filter (where ${campaignTargets.status} = 'queued')`.mapWith(Number),
        completed: sql<number>`count(*) filter (where ${campaignTargets.status} = 'completed')`.mapWith(Number),
        failed: sql<number>`count(*) filter (where ${campaignTargets.status} = 'failed')`.mapWith(Number),
        dnc: sql<number>`count(*) filter (where ${campaignTargets.status} = 'dnc')`.mapWith(Number),
      })
      .from(campaignTargets)
      .where(and(eq(campaignTargets.tenantId, tenantId), eq(campaignTargets.campaignId, id)));
    return counts;
  }

  async create(tenantId: string, dto: CreateCampaignDto, actorUserId: string) {
    const [credential] = await this.db
      .select({ id: tenantTelephonyCredentials.id })
      .from(tenantTelephonyCredentials)
      .where(
        and(
          tenantWhere(tenantTelephonyCredentials.tenantId, tenantId),
          eq(tenantTelephonyCredentials.id, dto.credentialId),
        ),
      )
      .limit(1);
    if (!credential) {
      throw badRequest('CREDENTIAL_NOT_FOUND', 'That telephony credential does not belong to this tenant');
    }

    const [campaign] = await this.db
      .insert(campaigns)
      .values({
        tenantId,
        name: dto.name,
        credentialId: dto.credentialId,
        schedule: dto.schedule ?? {},
        defaultBotId: dto.defaultBotId,
        createdBy: actorUserId,
      })
      .returning();
    return campaign;
  }

  async update(tenantId: string, id: string, dto: UpdateCampaignDto) {
    await this.get(tenantId, id);
    const [campaign] = await this.db
      .update(campaigns)
      .set({
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.schedule !== undefined ? { schedule: dto.schedule } : {}),
        ...(dto.defaultBotId !== undefined ? { defaultBotId: dto.defaultBotId } : {}),
      })
      .where(eq(campaigns.id, id))
      .returning();
    return campaign;
  }

  private async setStatus(
    tenantId: string,
    id: string,
    allowedFrom: Array<(typeof campaigns.$inferSelect)['status']>,
    to: (typeof campaigns.$inferSelect)['status'],
  ) {
    const campaign = await this.get(tenantId, id);
    if (!allowedFrom.includes(campaign.status)) {
      throw badRequest(
        'INVALID_CAMPAIGN_TRANSITION',
        `Cannot move campaign from ${campaign.status} to ${to}`,
      );
    }
    const [updated] = await this.db
      .update(campaigns)
      .set({ status: to })
      .where(eq(campaigns.id, id))
      .returning();
    return updated;
  }

  start(tenantId: string, id: string) {
    return this.setStatus(tenantId, id, ['draft', 'scheduled', 'locked'], 'running');
  }

  pause(tenantId: string, id: string) {
    return this.setStatus(tenantId, id, ['running'], 'locked');
  }

  async remove(tenantId: string, id: string) {
    await this.get(tenantId, id);
    await this.db.update(campaigns).set({ status: 'deleted' }).where(eq(campaigns.id, id));
    return { ok: true };
  }

  listTargets(tenantId: string, campaignId: string) {
    return this.db
      .select()
      .from(campaignTargets)
      .where(and(eq(campaignTargets.tenantId, tenantId), eq(campaignTargets.campaignId, campaignId)));
  }

  async setTargetEnabled(tenantId: string, campaignId: string, targetId: string, enabled: boolean) {
    const [target] = await this.db
      .select({ id: campaignTargets.id })
      .from(campaignTargets)
      .where(
        and(
          eq(campaignTargets.tenantId, tenantId),
          eq(campaignTargets.campaignId, campaignId),
          eq(campaignTargets.id, targetId),
        ),
      )
      .limit(1);
    if (!target) throw notFound('TARGET_NOT_FOUND', 'Campaign target not found');

    const [updated] = await this.db
      .update(campaignTargets)
      .set({ enabled })
      .where(eq(campaignTargets.id, targetId))
      .returning();
    return updated;
  }
}
