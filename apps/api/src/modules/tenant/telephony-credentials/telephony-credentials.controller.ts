import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Put, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { TenantAuthGuard } from '../../auth/guards/tenant-auth.guard';
import { TenantRoles, TenantRolesGuard } from '../../auth/guards/tenant-roles.guard';
import { CurrentTenantActor } from '../../auth/current-actor.decorator';
import type { TenantActor } from '../../auth/jwt-types';
import { TelephonyCredentialsService } from './telephony-credentials.service';
import { UpsertTelephonyCredentialDto } from './dto/telephony-credential.dto';
import { ApiExceptionFilter } from '../../../common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';

@Controller('tenant/telephony-credentials')
@UseGuards(TenantAuthGuard, TenantRolesGuard)
@TenantRoles('tenant_admin')
@UseInterceptors(ResponseInterceptor)
@UseFilters(ApiExceptionFilter)
export class TelephonyCredentialsController {
  constructor(private readonly credentials: TelephonyCredentialsService) {}

  @Get()
  list(@CurrentTenantActor() actor: TenantActor) {
    return this.credentials.list(actor.tenantId).then((credentials) => ({ credentials }));
  }

  @Put()
  upsert(@CurrentTenantActor() actor: TenantActor, @Body() dto: UpsertTelephonyCredentialDto) {
    return this.credentials
      .upsert(actor.tenantId, dto, actor.tenantUserId)
      .then((credential) => ({ credential }));
  }

  @Delete(':id')
  deactivate(@CurrentTenantActor() actor: TenantActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.credentials.deactivate(actor.tenantId, id);
  }
}
