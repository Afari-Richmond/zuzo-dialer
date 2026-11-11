import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { OutboundDialerModule } from '../../voice/outbound-dialer.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  imports: [AuthModule, OutboundDialerModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
