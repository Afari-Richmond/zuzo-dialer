import {
  CallStatusEvent,
  InboundCallEvent,
  StartOutboundCallInput,
  TransferCallInput,
  VoiceProviderAdapter,
} from './voice-provider.adapter';
import type { LiveHubCredentials } from './credentials.types';
import { badRequest } from '../../../common/errors';

const BASE_URL = 'https://livehub.audiocodes.io';

function toE164Ghana(local: string): string {
  const digits = local.replace(/\D/g, '');
  if (digits.startsWith('233')) return `+${digits}`;
  if (digits.startsWith('0')) return `+233${digits.slice(1)}`;
  return `+${digits}`;
}

// One instance per tenant (via VoiceAdapterFactoryService) — tokenCache is
// correct to keep as instance state now, since it's scoped to one tenant's
// credentials instead of being a process-wide global.
export class LiveHubAdapter implements VoiceProviderAdapter {
  readonly name = 'livehub';

  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(private readonly creds: LiveHubCredentials) {}

  verifyWebhook(): boolean {
    // No status-webhook receiver wired for LiveHub yet; LiveHub's own
    // Calls/Logs UI is the source of truth for conversation detail.
    return true;
  }

  parseInbound(payload: Record<string, unknown>): InboundCallEvent {
    return {
      provider: this.name,
      providerCallId: String(payload.callId || payload.providerCallId || ''),
      from: payload.from ? String(payload.from) : undefined,
      to: payload.to ? String(payload.to) : undefined,
      raw: payload,
    };
  }

  parseCallStatus(payload: Record<string, unknown>): CallStatusEvent {
    const raw = String(payload.status || 'in_progress').toLowerCase();
    const map: Record<string, CallStatusEvent['status']> = {
      answered: 'in_progress',
      failed: 'failed',
      completed: 'completed',
      no_answer: 'no_answer',
      busy: 'busy',
    };
    return {
      provider: this.name,
      providerCallId: String(payload.callId || ''),
      status: map[raw] ?? 'in_progress',
      answeredBy: 'unknown',
    };
  }

  private async getToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 30_000) {
      return this.tokenCache.token;
    }
    const res = await fetch(`${BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.creds.clientId,
        client_secret: this.creds.clientSecret,
      }),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub oauth/token failed (${res.status}): ${bodyText}`);
    }
    const json = JSON.parse(bodyText) as { access_token: string; expires_in: number };
    this.tokenCache = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
    return json.access_token;
  }

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.getToken();
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
  }

  async startOutboundCall(input: StartOutboundCallInput): Promise<{ providerCallId: string }> {
    if (!input.campaignId) {
      throw badRequest(
        'LIVEHUB_CAMPAIGN_REQUIRED',
        'LiveHub dials through a campaign — campaignId is required',
      );
    }
    const target = toE164Ghana(input.to);
    const res = await this.request(
      `/api/v1/campaignDialer/campaigns/${input.campaignId}/targets`,
      {
        method: 'POST',
        body: JSON.stringify({
          targets: [
            {
              targetNumber: `tel:${target}`,
              callingNumber: 'Anonymous',
              botName: this.creds.outreachBotId,
              enabled: true,
              ...(input.metadata ? { botMetadata: JSON.stringify(input.metadata) } : {}),
            },
          ],
        }),
      },
    );
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`LiveHub add-target failed (${res.status}) for ${target}: ${bodyText}`);
    }
    const parsed = JSON.parse(bodyText) as
      | { result: string; targetID: string }[]
      | { targets: { result: string; targetID: string }[] };
    const entry = Array.isArray(parsed) ? parsed[0] : parsed.targets?.[0];
    if (!entry || entry.result !== 'Success') {
      throw new Error(`LiveHub target rejected for ${target}: ${bodyText}`);
    }
    return { providerCallId: entry.targetID };
  }

  async transfer(_input: TransferCallInput): Promise<void> {
    // warm_transfer handles handoff via a callback ticket elsewhere;
    // no SIP-level transfer wired for LiveHub yet.
    return;
  }
}
