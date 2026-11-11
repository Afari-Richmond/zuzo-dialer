import { Controller, Get, UseGuards } from '@nestjs/common';
import { PlatformAuthGuard } from '../../auth/guards/platform-auth.guard';
import { PlatformStatsService } from './platform-stats.service';

@Controller('platform/stats')
@UseGuards(PlatformAuthGuard)
export class PlatformStatsController {
  constructor(private readonly stats: PlatformStatsService) {}

  @Get()
  overview() {
    return this.stats.overview();
  }
}
