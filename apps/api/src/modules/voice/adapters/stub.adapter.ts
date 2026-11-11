import {
  CallStatusEvent,
  InboundCallEvent,
  StartOutboundCallInput,
  TransferCallInput,
  VoiceProviderAdapter,
} from './voice-provider.adapter';

// Every tenant's zero-config default/demo provider — no credentials needed.
export class StubAdapter implements VoiceProviderAdapter {
  readonly name = 'stub';

  verifyWebhook(): boolean {
    return true;
  }

  parseInbound(payload: Record<string, unknown>): InboundCallEvent {
    return {
      provider: this.name,
      providerCallId: String(
        payload.CallSid || payload.sessionId || payload.callId || `stub-${Date.now()}`,
      ),
      from: payload.From ? String(payload.From) : payload.from ? String(payload.from) : undefined,
      to: payload.To ? String(payload.To) : payload.to ? String(payload.to) : undefined,
      raw: payload,
    };
  }

  parseCallStatus(payload: Record<string, unknown>): CallStatusEvent {
    const raw = String(payload.CallStatus || payload.status || 'in_progress');
    const statusMap: Record<string, CallStatusEvent['status']> = {
      ringing: 'ringing',
      'in-progress': 'in_progress',
      in_progress: 'in_progress',
      completed: 'completed',
      failed: 'failed',
      busy: 'busy',
      'no-answer': 'no_answer',
      no_answer: 'no_answer',
      voicemail: 'voicemail',
      transferred: 'transferred',
    };
    return {
      provider: this.name,
      providerCallId: String(payload.CallSid || payload.callId || ''),
      status: statusMap[raw] ?? 'in_progress',
      answeredBy:
        payload.AnsweredBy === 'machine'
          ? 'machine'
          : payload.AnsweredBy === 'human'
            ? 'human'
            : 'unknown',
      durationSeconds: payload.CallDuration ? Number(payload.CallDuration) : undefined,
    };
  }

  async startOutboundCall(input: StartOutboundCallInput): Promise<{ providerCallId: string }> {
    return { providerCallId: `stub-out-${input.to}-${Date.now()}` };
  }

  async transfer(_input: TransferCallInput): Promise<void> {
    return;
  }
}
