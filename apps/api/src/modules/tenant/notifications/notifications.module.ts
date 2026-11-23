import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { TenantApiKeyGuard } from '../../auth/guards/tenant-api-key.guard';
import { OutreachModule } from '../outreach/outreach.module';
import { TenantApiKeysModule } from '../api-keys/tenant-api-keys.module';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [AuthModule, OutreachModule, TenantApiKeysModule],
  controllers: [NotificationsController],
  providers: [TenantApiKeyGuard],
})
export class NotificationsModule {}
