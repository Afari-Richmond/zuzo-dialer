import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PlatformStatsController } from './platform-stats.controller';
import { PlatformStatsService } from './platform-stats.service';

@Module({
  imports: [AuthModule],
  controllers: [PlatformStatsController],
  providers: [PlatformStatsService],
})
export class PlatformStatsModule {}
