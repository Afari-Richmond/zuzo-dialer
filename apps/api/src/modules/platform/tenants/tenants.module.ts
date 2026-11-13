import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { TelephonyCredentialsModule } from '../../tenant/telephony-credentials/telephony-credentials.module';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [AuthModule, TelephonyCredentialsModule],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
