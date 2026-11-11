import { Body, Controller, Get, Put, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { TenantAuthGuard } from '../../auth/guards/tenant-auth.guard';
import { TenantRoles, TenantRolesGuard } from '../../auth/guards/tenant-roles.guard';
import { CurrentTenantActor } from '../../auth/current-actor.decorator';
import type { TenantActor } from '../../auth/jwt-types';
import { ApiExceptionFilter } from '../../../common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';
import { AiAgentService } from './ai-agent.service';
import { SetAiAgentDto, SetAiAgentModelDto } from './dto/ai-agent.dto';

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
}
