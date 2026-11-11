import { createHmac, timingSafeEqual } from 'crypto';
import {
  CallStatusEvent,
  InboundCallEvent,
  StartOutboundCallInput,
  TransferCallInput,
  VoiceProviderAdapter,
} from './voice-provider.adapter';
import type { AfricaTalkingCredentials } from './credentials.types';

export class AfricaTalkingAdapter implements VoiceProviderAdapter {
  readonly name = 'africastalking';

  constructor(private readonly creds: AfricaTalkingCredentials) {}

  verifyWebhook(rawBody: string | Buffer, signature: string | undefined): boolean {
    const secret = this.creds.webhookSecret?.trim();
    if (!secret) return !signature;
    if (!signature) return false;
    const hash = createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(hash);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseInbound(payload: Record<string, unknown>): InboundCallEvent {
    return {
      provider: this.name,
      providerCallId: String(payload.sessionId || payload.callSessionState || payload.callId || ''),
      from: payload.callerNumber ? String(payload.callerNumber) : undefined,
      to: payload.destinationNumber ? String(payload.destinationNumber) : undefined,
      raw: payload,
    };
  }

  parseCallStatus(payload: Record<string, unknown>): CallStatusEvent {
    const raw = String(payload.status || payload.callSessionState || '').toLowerCase();
    return {
      provider: this.name,
      providerCallId: String(payload.sessionId || payload.callId || ''),
      status: raw.includes('complete')
        ? 'completed'
        : raw.includes('fail')
          ? 'failed'
          : raw.includes('voicemail')
            ? 'voicemail'
            : 'in_progress',
    };
  }

  async startOutboundCall(input: StartOutboundCallInput): Promise<{ providerCallId: string }> {
    const { username, apiKey, from } = this.creds;
    const res = await fetch('https://voice.africastalking.com/call', {
      method: 'POST',
      headers: {
        apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        username,
        from: input.from || from || '',
        to: input.to,
        clientRequestId: input.metadata?.attemptId || '',
      }),
    });
    const json = (await res.json()) as { entries?: { sessionId?: string }[] };
    const sid = json.entries?.[0]?.sessionId || `at-${Date.now()}`;
    return { providerCallId: sid };
  }

  async transfer(_input: TransferCallInput): Promise<void> {
    return;
  }
}
