import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { BillingModule as SharedBillingModule } from '../../billing/billing.module';
import { TenantBillingController } from './billing.controller';

@Module({
  imports: [AuthModule, SharedBillingModule],
  controllers: [TenantBillingController],
})
export class TenantBillingModule {}
