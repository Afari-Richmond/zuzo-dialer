import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { ApiExceptionFilter } from '../../../common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';
import { TenantAuthGuard } from '../../auth/guards/tenant-auth.guard';
import { CurrentTenantActor } from '../../auth/current-actor.decorator';
import type { TenantActor } from '../../auth/jwt-types';
import {
  AddTargetDto,
  AnalyticsOverviewQueryDto,
  CallNowDto,
  CreateCampaignDto,
  OutreachAttemptsQueryDto,
  OutreachDncDto,
  SetAiContextDto,
  SetRecommendationDto,
  UpdateCampaignDto,
  UploadBatchDto,
  UpsertOutcomeDto,
} from './dto/outreach.dto';
import { OutreachService } from './outreach.service';
import { OutboundDialerService } from './outbound-dialer.service';
import { badRequest } from '../../../common/errors';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
type MulterFileLike = { buffer: Buffer; originalname: string };

// Envelope-wrapped ({success,data}/{success:false,error}) only for this
// controller, to match the ported outreach frontend's api.ts exactly — every
// other controller in this app returns plain JSON and is unaffected.
@Controller('outreach')
@UseGuards(TenantAuthGuard)
@UseInterceptors(ResponseInterceptor)
@UseFilters(ApiExceptionFilter)
export class OutreachController {
  constructor(
    private readonly outreach: OutreachService,
    private readonly dialer: OutboundDialerService,
  ) {}

  /** Not part of the original app's surface (that used an @Interval cron) —
   * added since this project avoids @nestjs/schedule (ESM-only build breaks
   * Jest). Drains this tenant's queued attempts and reconciles 'dialing' ones. */
  @Post('drain')
  async drain(@CurrentTenantActor() actor: TenantActor) {
    const [drained, reconciled] = await Promise.all([
      this.dialer.drainQueue(actor.tenantId),
      this.dialer.reconcileOutboundStatuses(actor.tenantId),
    ]);
    return { ...drained, ...reconciled };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_FILE_BYTES } }))
  upload(
    @CurrentTenantActor() actor: TenantActor,
    @Body() dto: UploadBatchDto,
    @UploadedFile() file?: MulterFileLike,
  ) {
    if (!file) throw badRequest('FILE_REQUIRED', 'Attach an .xlsx or .csv file as "file"');
    return this.outreach.uploadBatch(actor.tenantId, dto.batch, file.buffer, dto.scheduledAt, dto.liveHubCampaignId);
  }

  @Get('attempts')
  async listAttempts(@CurrentTenantActor() actor: TenantActor, @Query() query: OutreachAttemptsQueryDto) {
    const attempts = await this.outreach.listAttempts(actor.tenantId, query);
    return { attempts };
  }

  @Get('batches')
  async listBatches(@CurrentTenantActor() actor: TenantActor) {
    const batches = await this.outreach.listBatches(actor.tenantId);
    return { batches };
  }

  @Post('dnc')
  addDnc(@CurrentTenantActor() actor: TenantActor, @Body() dto: OutreachDncDto) {
    return this.outreach.addDnc(actor.tenantId, dto);
  }

  @Get('analytics/overview')
  analyticsOverview(@CurrentTenantActor() actor: TenantActor, @Query() query: AnalyticsOverviewQueryDto) {
    return this.outreach.getAnalyticsOverview(actor.tenantId, query.from, query.to);
  }

  @Get('campaigns')
  async listCampaigns(@CurrentTenantActor() actor: TenantActor) {
    const campaigns = await this.outreach.listCampaigns(actor.tenantId);
    return { campaigns };
  }

  @Get('campaigns/timezones')
  async timezones(@CurrentTenantActor() actor: TenantActor) {
    const timezones = await this.outreach.listTimezones(actor.tenantId);
    return { timezones };
  }

  @Get('campaigns/bots')
  async bots(@CurrentTenantActor() actor: TenantActor) {
    const bots = await this.outreach.listBots(actor.tenantId);
    return { bots };
  }

  @Post('campaigns')
  createCampaign(@CurrentTenantActor() actor: TenantActor, @Body() dto: CreateCampaignDto) {
    return this.outreach.createCampaign(actor.tenantId, dto);
  }

  @Get('campaigns/:id')
  getCampaign(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string) {
    return this.outreach.getCampaign(actor.tenantId, id);
  }

  @Put('campaigns/:id')
  updateCampaign(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.outreach.updateCampaign(actor.tenantId, id, dto);
  }

  @Get('campaigns/:id/stats')
  campaignStats(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string) {
    return this.outreach.getCampaignOverview(actor.tenantId, id);
  }

  @Post('campaigns/:id/pause')
  pauseCampaign(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string) {
    return this.outreach.setCampaignLock(actor.tenantId, id, true);
  }

  @Post('campaigns/:id/resume')
  resumeCampaign(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string) {
    return this.outreach.setCampaignLock(actor.tenantId, id, false);
  }

  @Delete('campaigns/:id')
  deleteCampaign(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string) {
    return this.outreach.deleteCampaign(actor.tenantId, id);
  }

  @Get('campaigns/:id/targets')
  async listTargets(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string) {
    const targets = await this.outreach.listTargets(actor.tenantId, id);
    return { targets };
  }

  @Post('campaigns/:id/targets')
  addTarget(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string, @Body() dto: AddTargetDto) {
    return this.outreach.addTarget(actor.tenantId, id, dto);
  }

  @Post('campaigns/:id/targets/import')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_FILE_BYTES } }))
  importTargets(
    @CurrentTenantActor() actor: TenantActor,
    @Param('id') id: string,
    @UploadedFile() file?: MulterFileLike,
  ) {
    if (!file) throw badRequest('FILE_REQUIRED', 'Attach an .xlsx or .csv file as "file"');
    return this.outreach.importTargets(actor.tenantId, id, file.buffer);
  }

  @Post('campaigns/:id/targets/:targetId/enable')
  enableTarget(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string, @Param('targetId') targetId: string) {
    return this.outreach.setTargetEnabled(actor.tenantId, id, targetId, true);
  }

  @Post('campaigns/:id/targets/:targetId/disable')
  disableTarget(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string, @Param('targetId') targetId: string) {
    return this.outreach.setTargetEnabled(actor.tenantId, id, targetId, false);
  }

  @Get('campaigns/:id/report')
  getCampaignReport(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string) {
    return this.outreach.getCampaignReport(actor.tenantId, id);
  }

  @Get('calls/:conversationId/transcript')
  getConversationTranscript(@CurrentTenantActor() actor: TenantActor, @Param('conversationId') conversationId: string) {
    return this.outreach.getConversationTranscript(actor.tenantId, conversationId);
  }

  @Get('calls/:conversationId/analysis')
  getFullCallAnalysis(@CurrentTenantActor() actor: TenantActor, @Param('conversationId') conversationId: string) {
    return this.outreach.getFullCallAnalysis(actor.tenantId, conversationId);
  }

  @Get('campaigns/:id/report/export')
  async exportCampaignReport(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string, @Res() res: Response) {
    const { filename, buffer } = await this.outreach.exportCampaignReport(actor.tenantId, id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Put('campaigns/:id/outcomes/:targetId')
  upsertOutcome(
    @CurrentTenantActor() actor: TenantActor,
    @Param('id') id: string,
    @Param('targetId') targetId: string,
    @Body() dto: UpsertOutcomeDto,
  ) {
    return this.outreach.upsertOutcome(actor.tenantId, id, targetId, dto);
  }

  @Put('campaigns/:id/recommendation')
  setRecommendation(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string, @Body() dto: SetRecommendationDto) {
    return this.outreach.setRecommendation(actor.tenantId, id, dto);
  }

  @Get('campaigns/:id/ai-context')
  getAiContext(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string) {
    return this.outreach.getAiContext(actor.tenantId, id);
  }

  @Put('campaigns/:id/ai-context')
  setAiContext(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string, @Body() dto: SetAiContextDto) {
    return this.outreach.setAiContext(actor.tenantId, id, dto);
  }

  @Post('call-now')
  callNow(@CurrentTenantActor() actor: TenantActor, @Body() dto: CallNowDto) {
    return this.outreach.callNow(actor.tenantId, dto.phone, dto.reason, dto.liveHubCampaignId, dto.instant);
  }
}
