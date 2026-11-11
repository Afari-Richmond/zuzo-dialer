import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { TenantAuthGuard } from '../../auth/guards/tenant-auth.guard';
import { TenantRoles, TenantRolesGuard } from '../../auth/guards/tenant-roles.guard';
import { CurrentTenantActor } from '../../auth/current-actor.decorator';
import type { TenantActor } from '../../auth/jwt-types';
import { TeamService } from './team.service';
import { InviteTenantUserDto, UpdateTenantUserDto } from './dto/team.dto';
import { ApiExceptionFilter } from '../../../common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';

@Controller('tenant/team')
@UseGuards(TenantAuthGuard, TenantRolesGuard)
@TenantRoles('tenant_admin')
@UseInterceptors(ResponseInterceptor)
@UseFilters(ApiExceptionFilter)
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  list(@CurrentTenantActor() actor: TenantActor) {
    return this.team.list(actor.tenantId).then((members) => ({ members }));
  }

  @Post('invite')
  invite(@CurrentTenantActor() actor: TenantActor, @Body() dto: InviteTenantUserDto) {
    return this.team.invite(actor.tenantId, dto);
  }

  @Patch(':id')
  update(
    @CurrentTenantActor() actor: TenantActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantUserDto,
  ) {
    return this.team.update(actor.tenantId, id, dto).then((member) => ({ member }));
  }
}
