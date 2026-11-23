import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { TenantApiKeysController } from './tenant-api-keys.controller';
import { TenantApiKeysService } from './tenant-api-keys.service';

@Module({
  imports: [AuthModule],
  controllers: [TenantApiKeysController],
  providers: [TenantApiKeysService],
  exports: [TenantApiKeysService],
})
export class TenantApiKeysModule {}
