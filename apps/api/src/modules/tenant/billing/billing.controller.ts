import { Controller, Get, Query, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { TenantAuthGuard } from '../../auth/guards/tenant-auth.guard';
import { CurrentTenantActor } from '../../auth/current-actor.decorator';
import type { TenantActor } from '../../auth/jwt-types';
import { BillingService } from '../../billing/billing.service';
import { ApiExceptionFilter } from '../../../common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';

/** Read-only view onto the same plan/usage numbers the platform admin sees —
 * a tenant can check what they owe but never change their own rate or quota. */
@Controller('tenant/billing')
@UseGuards(TenantAuthGuard)
@UseInterceptors(ResponseInterceptor)
@UseFilters(ApiExceptionFilter)
export class TenantBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('usage')
  getUsage(@CurrentTenantActor() actor: TenantActor, @Query('from') from?: string, @Query('to') to?: string) {
    return this.billing.getUsageSummary(actor.tenantId, from, to).then((usage) => ({ usage }));
  }
}
