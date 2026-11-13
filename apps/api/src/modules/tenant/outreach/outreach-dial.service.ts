import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { voiceCalls, voiceCampaignReports, voiceDnc, voiceOutboundAttempts } from '../../../db/schema';
import { badRequest, notFound } from '../../../common/errors';
import { VoiceAdapterFactoryService } from '../../voice/voice-adapter-factory.service';
import { voiceWebhookUrl } from '../../voice/webhook-url';
import { normalizeGhanaPhone } from './phone';

const PUBLIC_API_URL_FALLBACK = 'http://localhost:3100';

const GHANA_TZ = 'Africa/Accra';
const CALLING_WINDOW_START = '08:00';
const CALLING_WINDOW_END = '18:00';
const MAX_ATTEMPTS = 3;
const OUTBOUND_CONCURRENCY = 5;

/**
 * Slim per-tenant port of the old single-tenant repo's VoiceService — keeps
 * the real DNC/max-attempts/calling-window/concurrency enforcement and
 * LiveHub dial mechanics, but drops identify_caller customer-matching and
 * the ZuZo-insurance VOICE_SCRIPTS personalization (no shared customers
 * table across tenants) in favor of using the contact's own name/reason,
 * already captured at upload time.
 */
@Injectable()
export class OutreachDialService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly adapterFactory: VoiceAdapterFactoryService,
    private readonly config: ConfigService,
  ) {}

  private webhookUrlFor(tenantId: string): string {
    const base = this.config.get<string>('PUBLIC_API_URL') || PUBLIC_API_URL_FALLBACK;
    return voiceWebhookUrl(base, tenantId);
  }

  private async getAiContext(tenantId: string, liveHubCampaignId: string): Promise<string | undefined> {
    const [row] = await this.db
      .select({ aiContext: voiceCampaignReports.aiContext })
      .from(voiceCampaignReports)
      .where(and(eq(voiceCampaignReports.tenantId, tenantId), eq(voiceCampaignReports.liveHubCampaignId, liveHubCampaignId)))
      .limit(1);
    return row?.aiContext ?? undefined;
  }

  async isDnc(tenantId: string, phone: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: voiceDnc.id })
      .from(voiceDnc)
      .where(and(eq(voiceDnc.tenantId, tenantId), eq(voiceDnc.phone, phone)))
      .limit(1);
    return !!row;
  }

  async addDnc(tenantId: string, phoneRaw: string, reason?: string, source = 'manual') {
    const phone = normalizeGhanaPhone(phoneRaw);
    if (!phone) throw badRequest('INVALID_PHONE', 'Need a Ghana phone number');
    await this.db
      .insert(voiceDnc)
      .values({ tenantId, phone, reason: reason ?? null, source })
      .onConflictDoUpdate({
        target: [voiceDnc.tenantId, voiceDnc.phone],
        set: { reason: reason ?? null, source },
      });
    return { phone, dnc: true };
  }

  inCallingWindow(now = new Date()): boolean {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: GHANA_TZ,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const weekday = parts.find((p) => p.type === 'weekday')?.value;
    const hour = Number(parts.find((p) => p.type === 'hour')?.value);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value);
    if (!weekday || ['Sat', 'Sun'].includes(weekday)) return false;
    const start = this.parseHm(CALLING_WINDOW_START);
    const end = this.parseHm(CALLING_WINDOW_END);
    const mins = hour * 60 + minute;
    return mins >= start && mins < end;
  }

  private parseHm(value: string): number {
    const [h, m] = value.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  async enqueueOutbound(
    tenantId: string,
    input: {
      campaign: string;
      liveHubCampaignId?: string;
      phone: string;
      name?: string;
      reason?: string;
      scheduledAt?: string;
    },
  ) {
    const phone = normalizeGhanaPhone(input.phone);
    if (!phone) throw badRequest('INVALID_PHONE', 'Need a Ghana phone number');
    if (await this.isDnc(tenantId, phone)) {
      return { accepted: false, reason: 'dnc', phone };
    }
    const prior = await this.db
      .select()
      .from(voiceOutboundAttempts)
      .where(
        and(
          eq(voiceOutboundAttempts.tenantId, tenantId),
          eq(voiceOutboundAttempts.phone, phone),
          eq(voiceOutboundAttempts.campaign, input.campaign),
        ),
      );
    if (prior.length >= MAX_ATTEMPTS) {
      return { accepted: false, reason: 'max_attempts', phone, attempts: prior.length };
    }
    const [row] = await this.db
      .insert(voiceOutboundAttempts)
      .values({
        tenantId,
        campaign: input.campaign,
        liveHubCampaignId: input.liveHubCampaignId ?? null,
        phone,
        name: input.name ?? null,
        reason: input.reason ?? null,
        status: 'queued',
        attemptNumber: prior.length + 1,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : new Date(),
      })
      .returning();
    return { accepted: true, attempt: row };
  }

  async startOutbound(tenantId: string, attemptId: string) {
    const [attempt] = await this.db
      .select()
      .from(voiceOutboundAttempts)
      .where(and(eq(voiceOutboundAttempts.tenantId, tenantId), eq(voiceOutboundAttempts.id, attemptId)))
      .limit(1);
    if (!attempt) throw notFound('OUTBOUND_NOT_FOUND', 'Outbound attempt missing');
    if (await this.isDnc(tenantId, attempt.phone)) {
      await this.db
        .update(voiceOutboundAttempts)
        .set({ status: 'dnc' })
        .where(eq(voiceOutboundAttempts.id, attemptId));
      return { dialed: false, reason: 'dnc' };
    }
    if (!this.inCallingWindow()) {
      await this.db
        .update(voiceOutboundAttempts)
        .set({ status: 'outside_window' })
        .where(eq(voiceOutboundAttempts.id, attemptId));
      return { dialed: false, reason: 'outside_window' };
    }

    const staleCutoff = new Date(Date.now() - 10 * 60 * 1000);
    const [active] = await this.db
      .select({ n: sql<number>`count(*)` })
      .from(voiceOutboundAttempts)
      .where(
        and(
          eq(voiceOutboundAttempts.tenantId, tenantId),
          eq(voiceOutboundAttempts.status, 'dialing'),
          gte(voiceOutboundAttempts.startedAt, staleCutoff),
        ),
      );
    if (Number(active?.n ?? 0) >= OUTBOUND_CONCURRENCY) {
      return { dialed: false, reason: 'concurrency' };
    }

    const adapter = await this.adapterFactory.getAdapterForTenant(tenantId);
    const callId = `vc_${randomUUID()}`;
    const webhookUrl = this.webhookUrlFor(tenantId);
    const reason = attempt.reason || undefined;
    const aiContext = attempt.liveHubCampaignId
      ? await this.getAiContext(tenantId, attempt.liveHubCampaignId)
      : undefined;

    let started: { providerCallId: string };
    try {
      started = await adapter.startOutboundCall({
        to: attempt.phone,
        webhookUrl,
        campaignId: attempt.liveHubCampaignId ?? undefined,
        metadata: {
          attemptId,
          campaign: attempt.campaign,
          ...(attempt.name ? { name: attempt.name } : {}),
          ...(reason ? { reason } : {}),
          ...(aiContext ? { campaignContext: aiContext } : {}),
        },
      });
    } catch (err) {
      await this.db
        .update(voiceOutboundAttempts)
        .set({ status: 'failed', lastError: (err as Error).message.slice(0, 500) })
        .where(eq(voiceOutboundAttempts.id, attemptId));
      return { dialed: false, reason: 'provider_error', error: (err as Error).message };
    }

    await this.db.insert(voiceCalls).values({
      tenantId,
      callId,
      provider: adapter.name,
      providerCallId: started.providerCallId,
      direction: 'outbound',
      status: 'ringing',
      toNumber: attempt.phone,
      campaign: attempt.campaign,
      startedAt: new Date(),
    });

    await this.db
      .update(voiceOutboundAttempts)
      .set({ status: 'dialing', startedAt: new Date(), callId })
      .where(eq(voiceOutboundAttempts.id, attemptId));

    return { dialed: true, callId, providerCallId: started.providerCallId, reason };
  }

  /**
   * Dials immediately via LiveHub's single-call Dialout API, bypassing the
   * Campaign Dialer's scheduler/pacing entirely — for an urgent one-off call.
   * DNC is still enforced; calling-window and concurrency are deliberately
   * skipped since bypassing the pacing model is the point of this path.
   */
  async dialoutNow(tenantId: string, phone: string, reason?: string) {
    const normalized = normalizeGhanaPhone(phone);
    if (!normalized) throw badRequest('INVALID_PHONE', 'Need a Ghana phone number');
    if (await this.isDnc(tenantId, normalized)) {
      return { dialed: false, reason: 'dnc' };
    }
    const liveHub = await this.adapterFactory.getLiveHubAdapterForTenant(tenantId);
    const botId = liveHub.defaultBotId();
    if (!botId) {
      return { dialed: false, reason: 'no_bot_configured' };
    }

    const callId = `vc_${randomUUID()}`;
    const webhookUrl = this.webhookUrlFor(tenantId);

    let dialed: { callId: string; conversationId: string };
    try {
      dialed = await liveHub.dialout({
        botName: botId,
        target: normalized,
        notifyUrl: webhookUrl,
        metadata: { attemptId: callId, ...(reason ? { reason } : {}) },
        answerTimeoutSec: 30,
        machineDetection: 'detect',
        voicemailEndTimeoutSec: 15,
      });
    } catch (err) {
      return { dialed: false, reason: 'provider_error', error: (err as Error).message };
    }

    await this.db.insert(voiceCalls).values({
      tenantId,
      callId,
      provider: liveHub.name,
      providerCallId: dialed.callId,
      direction: 'outbound',
      status: 'ringing',
      toNumber: normalized,
      campaign: 'Instant dial (Dialout API)',
      startedAt: new Date(),
    });

    const [attempt] = await this.db
      .insert(voiceOutboundAttempts)
      .values({
        tenantId,
        campaign: 'Instant dial (Dialout API)',
        phone: normalized,
        reason: reason ?? null,
        status: 'dialing',
        startedAt: new Date(),
        callId,
      })
      .returning();

    return { dialed: true, callId, providerCallId: dialed.callId, conversationId: dialed.conversationId, attempt, reason };
  }

  listOutboundAttempts(tenantId: string, filter: { campaign?: string; status?: string } = {}) {
    const conditions = [eq(voiceOutboundAttempts.tenantId, tenantId)];
    if (filter.campaign) conditions.push(eq(voiceOutboundAttempts.campaign, filter.campaign));
    if (filter.status) {
      conditions.push(
        eq(
          voiceOutboundAttempts.status,
          filter.status as (typeof voiceOutboundAttempts.status.enumValues)[number],
        ),
      );
    }
    return this.db
      .select()
      .from(voiceOutboundAttempts)
      .where(and(...conditions))
      .orderBy(desc(voiceOutboundAttempts.createdAt))
      .limit(200);
  }

  listBatches(tenantId: string) {
    return this.db
      .select({
        campaign: voiceOutboundAttempts.campaign,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(voiceOutboundAttempts)
      .where(eq(voiceOutboundAttempts.tenantId, tenantId))
      .groupBy(voiceOutboundAttempts.campaign)
      .orderBy(desc(sql`max(${voiceOutboundAttempts.createdAt})`));
  }
}
