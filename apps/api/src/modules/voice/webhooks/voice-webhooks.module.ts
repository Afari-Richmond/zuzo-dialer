import { Module } from '@nestjs/common';
import { VoiceModule } from '../voice.module';
import { VoiceWebhooksController } from './voice-webhooks.controller';
import { VoiceWebhooksService } from './voice-webhooks.service';

@Module({
  imports: [VoiceModule],
  controllers: [VoiceWebhooksController],
  providers: [VoiceWebhooksService],
})
export class VoiceWebhooksModule {}
