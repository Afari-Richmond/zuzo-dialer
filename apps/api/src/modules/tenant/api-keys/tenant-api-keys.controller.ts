import { Controller, Get, Post, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { TenantAuthGuard } from '../../auth/guards/tenant-auth.guard';
import { TenantRoles, TenantRolesGuard } from '../../auth/guards/tenant-roles.guard';
import { CurrentTenantActor } from '../../auth/current-actor.decorator';
import type { TenantActor } from '../../auth/jwt-types';
import { TenantApiKeysService } from './tenant-api-keys.service';
import { ApiExceptionFilter } from '../../../common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';

@Controller('tenant/api-keys')
@UseGuards(TenantAuthGuard)
@UseInterceptors(ResponseInterceptor)
@UseFilters(ApiExceptionFilter)
export class TenantApiKeysController {
  constructor(private readonly apiKeys: TenantApiKeysService) {}

  @Get()
  getStatus(@CurrentTenantActor() actor: TenantActor) {
    return this.apiKeys.getStatus(actor.tenantId);
  }

  @Post('generate')
  @UseGuards(TenantRolesGuard)
  @TenantRoles('tenant_admin')
  async generate(@CurrentTenantActor() actor: TenantActor) {
    const apiKey = await this.apiKeys.generate(actor.tenantId, actor.tenantUserId);
    return { apiKey };
  }
}
