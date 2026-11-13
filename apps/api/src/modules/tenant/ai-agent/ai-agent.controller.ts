import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TenantAuthGuard } from '../../auth/guards/tenant-auth.guard';
import { TenantRoles, TenantRolesGuard } from '../../auth/guards/tenant-roles.guard';
import { CurrentTenantActor } from '../../auth/current-actor.decorator';
import type { TenantActor } from '../../auth/jwt-types';
import { ApiExceptionFilter } from '../../../common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';
import { AiAgentService } from './ai-agent.service';
import {
  SetAiAgentDto,
  SetAiAgentModelDto,
  SetAiAgentPromptDto,
  SetAiAgentVoiceDto,
  SetCallTransferDto,
  SetWelcomeMessageDto,
  ToolFormDto,
  UploadDocumentDto,
} from './dto/ai-agent.dto';
import { badRequest } from '../../../common/errors';

const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
type MulterFileLike = { buffer: Buffer; originalname: string };

@Controller('tenant/ai-agent')
@UseGuards(TenantAuthGuard)
@UseInterceptors(ResponseInterceptor)
@UseFilters(ApiExceptionFilter)
export class AiAgentController {
  constructor(private readonly aiAgent: AiAgentService) {}

  @Get('config')
  getConfig(@CurrentTenantActor() actor: TenantActor) {
    return this.aiAgent.getConfig(actor.tenantId);
  }

  @Put('config')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('tenant_admin')
  setAgent(@CurrentTenantActor() actor: TenantActor, @Body() dto: SetAiAgentDto) {
    return this.aiAgent.setAgent(actor.tenantId, dto);
  }

  @Get('agents')
  listAgents(@CurrentTenantActor() actor: TenantActor) {
    return this.aiAgent.listAgents(actor.tenantId);
  }

  @Get('models')
  listModels(@CurrentTenantActor() actor: TenantActor) {
    return this.aiAgent.listModels(actor.tenantId);
  }

  @Get('current')
  getCurrent(@CurrentTenantActor() actor: TenantActor) {
    return this.aiAgent.getCurrent(actor.tenantId);
  }

  @Put('model')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('tenant_admin')
  setModel(@CurrentTenantActor() actor: TenantActor, @Body() dto: SetAiAgentModelDto) {
    return this.aiAgent.setModel(actor.tenantId, dto);
  }

  @Get('prompt')
  getPrompt(@CurrentTenantActor() actor: TenantActor) {
    return this.aiAgent.getPrompt(actor.tenantId);
  }

  @Put('prompt')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('tenant_admin')
  setPrompt(@CurrentTenantActor() actor: TenantActor, @Body() dto: SetAiAgentPromptDto) {
    return this.aiAgent.setPrompt(actor.tenantId, dto);
  }

  @Get('documents')
  listDocuments(@CurrentTenantActor() actor: TenantActor) {
    return this.aiAgent.listDocuments(actor.tenantId);
  }

  @Get('tools')
  listTools(@CurrentTenantActor() actor: TenantActor) {
    return this.aiAgent.listTools(actor.tenantId);
  }

  @Get('tools/:id')
  getTool(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string) {
    return this.aiAgent.getTool(actor.tenantId, id);
  }

  @Post('tools')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('tenant_admin')
  createTool(@CurrentTenantActor() actor: TenantActor, @Body() dto: ToolFormDto) {
    return this.aiAgent.createTool(actor.tenantId, dto);
  }

  @Put('tools/:id')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('tenant_admin')
  updateTool(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string, @Body() dto: ToolFormDto) {
    return this.aiAgent.updateTool(actor.tenantId, id, dto);
  }

  @Delete('tools/:id')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('tenant_admin')
  deleteTool(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string) {
    return this.aiAgent.deleteTool(actor.tenantId, id);
  }

  @Get('voice')
  getVoice(@CurrentTenantActor() actor: TenantActor) {
    return this.aiAgent.getVoice(actor.tenantId);
  }

  @Put('voice')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('tenant_admin')
  setVoice(@CurrentTenantActor() actor: TenantActor, @Body() dto: SetAiAgentVoiceDto) {
    return this.aiAgent.setVoice(actor.tenantId, dto);
  }

  @Get('welcome-message')
  getWelcomeMessage(@CurrentTenantActor() actor: TenantActor) {
    return this.aiAgent.getWelcomeMessage(actor.tenantId);
  }

  @Put('welcome-message')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('tenant_admin')
  setWelcomeMessage(@CurrentTenantActor() actor: TenantActor, @Body() dto: SetWelcomeMessageDto) {
    return this.aiAgent.setWelcomeMessage(actor.tenantId, dto);
  }

  @Get('call-transfer')
  getCallTransfer(@CurrentTenantActor() actor: TenantActor) {
    return this.aiAgent.getCallTransfer(actor.tenantId);
  }

  @Put('call-transfer')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('tenant_admin')
  setCallTransfer(@CurrentTenantActor() actor: TenantActor, @Body() dto: SetCallTransferDto) {
    return this.aiAgent.setCallTransfer(actor.tenantId, dto);
  }

  @Post('documents')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('tenant_admin')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_DOCUMENT_BYTES } }))
  uploadDocument(
    @CurrentTenantActor() actor: TenantActor,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file?: MulterFileLike,
  ) {
    if (!file) throw badRequest('FILE_REQUIRED', 'Attach a file as "file"');
    return this.aiAgent.uploadDocument(actor.tenantId, dto, file.buffer, file.originalname);
  }

  @Delete('documents/:id')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('tenant_admin')
  deleteDocument(@CurrentTenantActor() actor: TenantActor, @Param('id') id: string) {
    return this.aiAgent.deleteDocument(actor.tenantId, id);
  }
}
