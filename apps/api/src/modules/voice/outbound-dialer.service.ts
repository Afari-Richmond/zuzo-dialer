import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../db/database.module';
import type { Database } from '../../db/client';
import { campaignTargets, campaigns } from '../../db/schema';
import { VoiceAdapterFactoryService } from './voice-adapter-factory.service';
import { DncService } from '../tenant/dnc/dnc.service';

const WEBHOOK_URL_PLACEHOLDER = 'https://zuzo-dialer.invalid/webhooks/voice';

@Injectable()
export class OutboundDialerService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly adapterFactory: VoiceAdapterFactoryService,
    private readonly dnc: DncService,
  ) {}

  /** Dials every queued, enabled target on one campaign — triggered via the
   * tenant-facing /drain endpoint. Automatic background draining (polling or
   * a real scheduler) is a deployment concern for later, once this manual
   * path has proven out the dial/DNC/outcome mechanics. */
  async drainCampaign(tenantId: string, campaignId: string): Promise<{ processed: number }> {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.id, campaignId)))
      .limit(1);
    if (!campaign || campaign.status !== 'running') return { processed: 0 };

    const queued = await this.db
      .select()
      .from(campaignTargets)
      .where(
        and(
          eq(campaignTargets.tenantId, tenantId),
          eq(campaignTargets.campaignId, campaignId),
          eq(campaignTargets.status, 'queued'),
          eq(campaignTargets.enabled, true),
        ),
      );
    if (queued.length === 0) return { processed: 0 };

    const adapter = await this.adapterFactory.getAdapterForTenant(tenantId);

    for (const target of queued) {
      if (await this.dnc.isListed(tenantId, target.phone)) {
        await this.db
          .update(campaignTargets)
          .set({ status: 'dnc' })
          .where(eq(campaignTargets.id, target.id));
        continue;
      }

      await this.db
        .update(campaignTargets)
        .set({ status: 'dialing', attemptNumber: target.attemptNumber + 1 })
        .where(eq(campaignTargets.id, target.id));

      try {
        const { providerCallId } = await adapter.startOutboundCall({
          to: target.phone,
          webhookUrl: WEBHOOK_URL_PLACEHOLDER,
          campaignId: campaign.providerCampaignId ?? undefined,
        });
        await this.db
          .update(campaignTargets)
          .set({ status: 'completed', providerTargetId: providerCallId, startedAt: new Date() })
          .where(eq(campaignTargets.id, target.id));
      } catch (err) {
        await this.db
          .update(campaignTargets)
          .set({ status: 'failed', lastError: (err as Error).message })
          .where(eq(campaignTargets.id, target.id));
      }
    }

    return { processed: queued.length };
  }
}
