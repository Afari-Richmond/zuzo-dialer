import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, isNotNull, lte } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { voiceCalls, voiceOutboundAttempts } from '../../../db/schema';
import { VoiceAdapterFactoryService } from '../../voice/voice-adapter-factory.service';
import type { LiveHubAdapter } from '../../voice/adapters/livehub.adapter';
import { OutreachDialService } from './outreach-dial.service';

/**
 * Tenant-scoped port of the old single-tenant repo's OutboundDialerService.
 * Drains queued voiceOutboundAttempts rows and reconciles 'dialing' ones
 * against each tenant's own LiveHub account. Triggered manually via the
 * tenant-facing /outreach/drain endpoint rather than @nestjs/schedule's
 * @Interval — that package's ESM-only build breaks Jest's CJS test loader
 * (confirmed earlier in this project), and nothing here is exercised by a
 * cron today anyway.
 */
@Injectable()
export class OutboundDialerService {
  private readonly logger = new Logger(OutboundDialerService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly dial: OutreachDialService,
    private readonly adapterFactory: VoiceAdapterFactoryService,
  ) {}

  async drainQueue(tenantId: string): Promise<{ processed: number }> {
    const batch = await this.db
      .select()
      .from(voiceOutboundAttempts)
      .where(
        and(
          eq(voiceOutboundAttempts.tenantId, tenantId),
          eq(voiceOutboundAttempts.status, 'queued'),
          lte(voiceOutboundAttempts.scheduledAt, new Date()),
        ),
      )
      .limit(20);
    for (const attempt of batch) {
      try {
        await this.dial.startOutbound(tenantId, attempt.id);
      } catch (err) {
        this.logger.warn(`Outbound dial failed for attempt ${attempt.id}: ${(err as Error).message}`);
      }
    }
    return { processed: batch.length };
  }

  /**
   * Campaign Dialer pushes no per-call status, so 'dialing' rows only move
   * forward by polling the campaign's own target list, which does carry real
   * per-call outcomes.
   */
  async reconcileOutboundStatuses(tenantId: string): Promise<{ reconciled: number }> {
    const dialing = await this.db
      .select({
        attemptId: voiceOutboundAttempts.id,
        callId: voiceOutboundAttempts.callId,
        liveHubCampaignId: voiceOutboundAttempts.liveHubCampaignId,
        providerCallId: voiceCalls.providerCallId,
        vcId: voiceCalls.id,
      })
      .from(voiceOutboundAttempts)
      .innerJoin(voiceCalls, and(eq(voiceCalls.callId, voiceOutboundAttempts.callId), eq(voiceCalls.tenantId, tenantId)))
      .where(
        and(
          eq(voiceOutboundAttempts.tenantId, tenantId),
          eq(voiceOutboundAttempts.status, 'dialing'),
          isNotNull(voiceOutboundAttempts.callId),
        ),
      )
      .limit(100);
    if (dialing.length === 0) return { reconciled: 0 };

    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);

    const byCampaign = new Map<string, typeof dialing>();
    for (const row of dialing) {
      const campaignId = await liveHub.resolveCampaignId(row.liveHubCampaignId);
      const bucket = byCampaign.get(campaignId) ?? [];
      bucket.push(row);
      byCampaign.set(campaignId, bucket);
    }

    const byTargetId = new Map<string, Awaited<ReturnType<LiveHubAdapter['listCampaignTargets']>>[number]>();
    for (const campaignId of byCampaign.keys()) {
      try {
        const targets = await liveHub.listCampaignTargets(campaignId);
        for (const t of targets) byTargetId.set(t.targetID, t);
      } catch (err) {
        this.logger.warn(`LiveHub target list fetch failed for campaign ${campaignId}: ${(err as Error).message}`);
      }
    }

    let reconciled = 0;
    for (const row of dialing) {
      if (!row.providerCallId) continue;
      const target = byTargetId.get(row.providerCallId);
      if (!target) continue;
      const result = liveHub.reconcileTarget(target);
      if (!result) continue;

      const attemptStatus =
        result.outcome === 'success' ? ('completed' as const) : result.outcome === 'no_answer' ? ('no_answer' as const) : ('failed' as const);
      const callStatus = result.outcome === 'success' ? ('completed' as const) : result.outcome;

      await this.db
        .update(voiceOutboundAttempts)
        .set({ status: attemptStatus, lastError: result.failureReason })
        .where(eq(voiceOutboundAttempts.id, row.attemptId));
      await this.db
        .update(voiceCalls)
        .set({
          status: callStatus,
          endedAt: result.endedAt ?? new Date(),
          metrics: result.botResultMetadata ? { botResultMetadata: result.botResultMetadata } : undefined,
        })
        .where(eq(voiceCalls.id, row.vcId));
      reconciled += 1;
    }
    return { reconciled };
  }
}
