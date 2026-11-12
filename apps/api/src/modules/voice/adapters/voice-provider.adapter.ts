export type VoiceCallStatus =
  | 'ringing'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'transferred'
  | 'voicemail'
  | 'no_answer'
  | 'busy';

export interface InboundCallEvent {
  provider: string;
  providerCallId: string;
  from?: string;
  to?: string;
  raw?: Record<string, unknown>;
}

export interface CallStatusEvent {
  provider: string;
  providerCallId: string;
  status: VoiceCallStatus;
  answeredBy?: 'human' | 'machine' | 'unknown';
  durationSeconds?: number;
}

export interface StartOutboundCallInput {
  to: string;
  from?: string;
  webhookUrl: string;
  metadata?: Record<string, string>;
  /** LiveHub dials through a campaign's target list — ignored by other adapters. */
  campaignId?: string;
}

export interface TransferCallInput {
  providerCallId: string;
  target: string;
  metadata?: Record<string, string>;
}

/**
 * Every tenant gets their own adapter *instance*, constructed from that
 * tenant's decrypted credentials (see VoiceAdapterFactoryService) — adapters
 * never read ConfigService/process env for provider secrets.
 */
export interface VoiceProviderAdapter {
  readonly name: string;
  /** `requestUrl` must be the exact URL the provider was told to call (the
   * same string passed as `webhookUrl` to startOutboundCall) — Twilio's real
   * signature is computed over that URL, not whatever Express reports, which
   * can differ behind a proxy or be spoofed via the Host header. */
  verifyWebhook(
    rawBody: string | Buffer,
    signature: string | undefined,
    headers: Record<string, string | string[] | undefined>,
    requestUrl: string,
  ): boolean;
  parseInbound(payload: Record<string, unknown>): InboundCallEvent;
  parseCallStatus(payload: Record<string, unknown>): CallStatusEvent;
  startOutboundCall(input: StartOutboundCallInput): Promise<{ providerCallId: string }>;
  transfer(input: TransferCallInput): Promise<void>;
}
