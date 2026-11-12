import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { voiceCalls, voiceOutboundAttempts } from '../../../db/schema';
import { badRequest } from '../../../common/errors';
import { VoiceAdapterFactoryService } from '../voice-adapter-factory.service';
import { voiceWebhookUrl } from '../webhook-url';
import type { CallStatusEvent } from '../adapters/voice-provider.adapter';

const PUBLIC_API_URL_FALLBACK = 'http://localhost:3100';

/** Maps a provider's call-status event onto this project's own, coarser
 * voice_outbound_status enum — mirroring exactly the terminal states
 * OutboundDialerService.reconcileOutboundStatuses already uses for LiveHub,
 * so a campaign's attempt history reads the same regardless of which
 * telephony provider actually carried the call. */
function attemptStatusFor(event: CallStatusEvent): (typeof voiceOutboundAttempts.status.enumValues)[number] | null {
  if (event.status === 'completed') return event.answeredBy === 'machine' ? 'machine' : 'completed';
  if (event.status === 'voicemail') return 'machine';
  if (event.status === 'no_answer') return 'no_answer';
  if (event.status === 'busy' || event.status === 'failed') return 'failed';
  return null; // ringing / in_progress / transferred — not terminal yet
}

@Injectable()
export class VoiceWebhooksService {
  private readonly logger = new Logger(VoiceWebhooksService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly adapterFactory: VoiceAdapterFactoryService,
    private readonly config: ConfigService,
  ) {}

  webhookUrlFor(tenantId: string): string {
    const base = this.config.get<string>('PUBLIC_API_URL') || PUBLIC_API_URL_FALLBACK;
    return voiceWebhookUrl(base, tenantId);
  }

  async handleStatus(
    tenantId: string,
    body: Record<string, unknown>,
    rawBody: Buffer,
    signature: string | undefined,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<{ updated: boolean }> {
    const adapter = await this.adapterFactory.getAdapterForTenant(tenantId);
    const requestUrl = this.webhookUrlFor(tenantId);

    if (!adapter.verifyWebhook(rawBody, signature, headers, requestUrl)) {
      throw badRequest('INVALID_WEBHOOK_SIGNATURE', 'Webhook signature did not verify');
    }

    const event = adapter.parseCallStatus(body);
    if (!event.providerCallId) return { updated: false };

    const [call] = await this.db
      .select()
      .from(voiceCalls)
      .where(and(eq(voiceCalls.tenantId, tenantId), eq(voiceCalls.providerCallId, event.providerCallId)))
      .limit(1);
    if (!call) {
      this.logger.warn(`Webhook for unknown call: tenant=${tenantId} providerCallId=${event.providerCallId}`);
      return { updated: false };
    }

    const isTerminal = ['completed', 'failed', 'no_answer', 'busy'].includes(event.status);
    await this.db
      .update(voiceCalls)
      .set({
        status: event.status,
        ...(isTerminal ? { endedAt: new Date() } : {}),
        ...(event.durationSeconds !== undefined
          ? { metrics: { ...(call.metrics ?? {}), durationSeconds: event.durationSeconds } }
          : {}),
      })
      .where(eq(voiceCalls.id, call.id));

    const attemptStatus = attemptStatusFor(event);
    if (attemptStatus) {
      await this.db
        .update(voiceOutboundAttempts)
        .set({
          status: attemptStatus,
          ...(attemptStatus === 'failed' ? { lastError: `${adapter.name} reported ${event.status}` } : {}),
        })
        .where(and(eq(voiceOutboundAttempts.tenantId, tenantId), eq(voiceOutboundAttempts.callId, call.callId)));
    }

    return { updated: true };
  }
}
