import { Module } from '@nestjs/common';
import { VoiceModule } from './voice.module';
import { DncModule } from '../tenant/dnc/dnc.module';
import { OutboundDialerService } from './outbound-dialer.service';

@Module({
  imports: [VoiceModule, DncModule],
  providers: [OutboundDialerService],
  exports: [OutboundDialerService],
})
export class OutboundDialerModule {}
