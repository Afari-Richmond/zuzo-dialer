import { Body, Controller, Get, Put, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { TenantAuthGuard } from '../../auth/guards/tenant-auth.guard';
import { TenantRoles, TenantRolesGuard } from '../../auth/guards/tenant-roles.guard';
import { CurrentTenantActor } from '../../auth/current-actor.decorator';
import type { TenantActor } from '../../auth/jwt-types';
import { BrandingService } from './branding.service';
import { UpdateBrandingDto } from './dto/branding.dto';
import { ApiExceptionFilter } from '../../../common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';

@Controller('tenant/branding')
@UseGuards(TenantAuthGuard)
@UseInterceptors(ResponseInterceptor)
@UseFilters(ApiExceptionFilter)
export class BrandingController {
  constructor(private readonly branding: BrandingService) {}

  @Get()
  get(@CurrentTenantActor() actor: TenantActor) {
    return this.branding.get(actor.tenantId);
  }

  @Put()
  @UseGuards(TenantRolesGuard)
  @TenantRoles('tenant_admin')
  update(@CurrentTenantActor() actor: TenantActor, @Body() dto: UpdateBrandingDto) {
    return this.branding.update(actor.tenantId, dto);
  }
}
