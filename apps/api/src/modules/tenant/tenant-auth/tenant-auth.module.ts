import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { TenantAuthController } from './tenant-auth.controller';
import { TenantAuthService } from './tenant-auth.service';

@Module({
  imports: [AuthModule],
  controllers: [TenantAuthController],
  providers: [TenantAuthService],
  exports: [TenantAuthService],
})
export class TenantAuthModule {}
