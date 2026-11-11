import { Body, Controller, Delete, Get, Param, ParseBoolPipe, ParseUUIDPipe, Patch, Post, Put, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { TenantAuthGuard } from '../../auth/guards/tenant-auth.guard';
import { CurrentTenantActor } from '../../auth/current-actor.decorator';
import type { TenantActor } from '../../auth/jwt-types';
import { CampaignsService } from './campaigns.service';
import { CampaignReportsService } from './campaign-reports.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import { SetRecommendationDto, UpsertOutcomeDto } from './dto/report.dto';
import { OutboundDialerService } from '../../voice/outbound-dialer.service';

@Controller('tenant/campaigns')
@UseGuards(TenantAuthGuard)
export class CampaignsController {
  constructor(
    private readonly campaigns: CampaignsService,
    private readonly dialer: OutboundDialerService,
    private readonly reports: CampaignReportsService,
  ) {}

  @Get()
  list(@CurrentTenantActor() actor: TenantActor) {
    return this.campaigns.list(actor.tenantId).then((campaigns) => ({ campaigns }));
  }

  @Get(':id')
  get(@CurrentTenantActor() actor: TenantActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.get(actor.tenantId, id).then((campaign) => ({ campaign }));
  }

  @Get(':id/stats')
  stats(@CurrentTenantActor() actor: TenantActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.getStats(actor.tenantId, id);
  }

  @Post()
  create(@CurrentTenantActor() actor: TenantActor, @Body() dto: CreateCampaignDto) {
    return this.campaigns
      .create(actor.tenantId, dto, actor.tenantUserId)
      .then((campaign) => ({ campaign }));
  }

  @Patch(':id')
  update(
    @CurrentTenantActor() actor: TenantActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaigns.update(actor.tenantId, id, dto).then((campaign) => ({ campaign }));
  }

  @Post(':id/start')
  start(@CurrentTenantActor() actor: TenantActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.start(actor.tenantId, id).then((campaign) => ({ campaign }));
  }

  @Post(':id/pause')
  pause(@CurrentTenantActor() actor: TenantActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.pause(actor.tenantId, id).then((campaign) => ({ campaign }));
  }

  @Delete(':id')
  remove(@CurrentTenantActor() actor: TenantActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.remove(actor.tenantId, id);
  }

  @Post(':id/drain')
  drain(@CurrentTenantActor() actor: TenantActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.dialer.drainCampaign(actor.tenantId, id);
  }

  @Get(':id/targets')
  listTargets(@CurrentTenantActor() actor: TenantActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.listTargets(actor.tenantId, id).then((targets) => ({ targets }));
  }

  @Patch(':id/targets/:targetId')
  setTargetEnabled(
    @CurrentTenantActor() actor: TenantActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @Body('enabled', ParseBoolPipe) enabled: boolean,
  ) {
    return this.campaigns
      .setTargetEnabled(actor.tenantId, id, targetId, enabled)
      .then((target) => ({ target }));
  }

  @Get(':id/report')
  getReport(@CurrentTenantActor() actor: TenantActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.reports.getReport(actor.tenantId, id);
  }

  @Get(':id/report/export')
  async exportReport(
    @CurrentTenantActor() actor: TenantActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { filename, buffer } = await this.reports.exportReport(actor.tenantId, id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Put(':id/targets/:targetId/outcome')
  upsertOutcome(
    @CurrentTenantActor() actor: TenantActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @Body() dto: UpsertOutcomeDto,
  ) {
    return this.reports.upsertOutcome(actor.tenantId, id, targetId, dto, actor.tenantUserId);
  }

  @Put(':id/recommendation')
  setRecommendation(
    @CurrentTenantActor() actor: TenantActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetRecommendationDto,
  ) {
    return this.reports.setRecommendation(actor.tenantId, id, dto);
  }
}
