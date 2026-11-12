import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { VoiceModule } from '../../voice/voice.module';
import { IdempotencyInterceptor } from '../../../common/interceptors/idempotency.interceptor';
import { OutreachController } from './outreach.controller';
import { OutreachService } from './outreach.service';
import { OutreachDialService } from './outreach-dial.service';
import { OutboundDialerService } from './outbound-dialer.service';

@Module({
  imports: [AuthModule, VoiceModule],
  controllers: [OutreachController],
  providers: [OutreachService, OutreachDialService, OutboundDialerService, IdempotencyInterceptor],
  exports: [OutreachDialService, OutboundDialerService],
})
export class OutreachModule {}
