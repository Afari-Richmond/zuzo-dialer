import { Body, Controller, Headers, Param, Post, Req, UseFilters } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ApiExceptionFilter } from '../../../common/filters/http-exception.filter';
import { VoiceWebhooksService } from './voice-webhooks.service';

/**
 * Receives call-status callbacks from Twilio and Africa's Talking (LiveHub
 * is reconciled by polling instead — see OutboundDialerService — so posting
 * here for a LiveHub tenant is harmless but a no-op). Unauthenticated by
 * necessity (the provider, not a logged-in user, calls this) — protected by
 * each adapter's own webhook signature check instead of a guard.
 */
@Controller('webhooks/voice')
@UseFilters(ApiExceptionFilter)
export class VoiceWebhooksController {
  constructor(private readonly webhooks: VoiceWebhooksService) {}

  @Post(':tenantId/status')
  async status(
    @Param('tenantId') tenantId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-twilio-signature') twilioSignature: string | undefined,
    @Headers('x-webhook-signature') customSignature: string | undefined,
  ) {
    const rawBody = req.rawBody ?? Buffer.from('');
    const signature = twilioSignature ?? customSignature;
    return this.webhooks.handleStatus(tenantId, body, rawBody, signature, req.headers);
  }
}
