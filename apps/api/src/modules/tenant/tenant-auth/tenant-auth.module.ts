import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { EmailModule } from '../../email/email.module';
import { TenantAuthController } from './tenant-auth.controller';
import { TenantAuthService } from './tenant-auth.service';
import { TenantUserTokensService } from './tenant-user-tokens.service';

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [TenantAuthController],
  providers: [TenantAuthService, TenantUserTokensService],
  exports: [TenantAuthService, TenantUserTokensService],
})
export class TenantAuthModule {}
