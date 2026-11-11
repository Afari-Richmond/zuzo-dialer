import { createHmac, timingSafeEqual } from 'crypto';
import {
  CallStatusEvent,
  InboundCallEvent,
  StartOutboundCallInput,
  TransferCallInput,
  VoiceProviderAdapter,
} from './voice-provider.adapter';
import type { TwilioCredentials } from './credentials.types';

export class TwilioAdapter implements VoiceProviderAdapter {
  readonly name = 'twilio';

  constructor(private readonly creds: TwilioCredentials) {}

  verifyWebhook(rawBody: string | Buffer, signature: string | undefined): boolean {
    const secret = this.creds.webhookSecret?.trim() || this.creds.authToken?.trim();
    if (!secret) return !signature;
    if (!signature) return false;
    const hash = createHmac('sha1', secret).update(rawBody).digest('base64');
    const a = Buffer.from(hash);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseInbound(payload: Record<string, unknown>): InboundCallEvent {
    return {
      provider: this.name,
      providerCallId: String(payload.CallSid || payload.callSid || ''),
      from: payload.From ? String(payload.From) : undefined,
      to: payload.To ? String(payload.To) : undefined,
      raw: payload,
    };
  }

  parseCallStatus(payload: Record<string, unknown>): CallStatusEvent {
    const raw = String(payload.CallStatus || payload.status || '').toLowerCase();
    const map: Record<string, CallStatusEvent['status']> = {
      queued: 'ringing',
      ringing: 'ringing',
      'in-progress': 'in_progress',
      completed: 'completed',
      busy: 'busy',
      failed: 'failed',
      'no-answer': 'no_answer',
      canceled: 'failed',
    };
    const answeredBy = String(payload.AnsweredBy || '').toLowerCase();
    return {
      provider: this.name,
      providerCallId: String(payload.CallSid || ''),
      status: map[raw] ?? 'in_progress',
      answeredBy: answeredBy.includes('machine')
        ? 'machine'
        : answeredBy === 'human'
          ? 'human'
          : 'unknown',
      durationSeconds: payload.CallDuration ? Number(payload.CallDuration) : undefined,
    };
  }

  async startOutboundCall(input: StartOutboundCallInput): Promise<{ providerCallId: string }> {
    const { accountSid, authToken, from } = this.creds;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: input.to,
        From: input.from || from || '',
        Url: input.webhookUrl,
      }),
    });
    const json = (await res.json()) as { sid?: string };
    return { providerCallId: json.sid || `twilio-${Date.now()}` };
  }

  async transfer(input: TransferCallInput): Promise<void> {
    const { accountSid, authToken } = this.creds;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${input.providerCallId}.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ Url: input.target, Method: 'POST' }),
      },
    );
  }
}
