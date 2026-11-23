import { Body, Controller, Post, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { TenantAuthGuard } from '../../auth/guards/tenant-auth.guard';
import { TenantApiKeyGuard } from '../../auth/guards/tenant-api-key.guard';
import { CurrentTenantActor } from '../../auth/current-actor.decorator';
import type { TenantActor } from '../../auth/jwt-types';
import { OutreachDialService } from '../outreach/outreach-dial.service';
import { SendNotificationDto } from './dto/notification.dto';
import { ApiExceptionFilter } from '../../../common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';

@Controller('tenant/notifications')
@UseInterceptors(ResponseInterceptor)
@UseFilters(ApiExceptionFilter)
export class NotificationsController {
  constructor(private readonly dial: OutreachDialService) {}

  /** The real integration point — a tenant's own backend calls this with
   * their API key, not a browser session, whenever something happens that
   * should trigger a one-way call (a rider is close, an order is ready, a
   * slot is open, anything "inform, don't converse"). */
  @Post('call')
  @UseGuards(TenantApiKeyGuard)
  sendCall(@CurrentTenantActor() actor: TenantActor, @Body() dto: SendNotificationDto) {
    return this.dial.sendNotificationCall(actor.tenantId, dto.phone, dto.message);
  }

  /** Same thing, callable from the dashboard itself (session-authed) so a
   * tenant can try the feature before wiring up their own backend. */
  @Post('test-call')
  @UseGuards(TenantAuthGuard)
  sendTestCall(@CurrentTenantActor() actor: TenantActor, @Body() dto: SendNotificationDto) {
    return this.dial.sendNotificationCall(actor.tenantId, dto.phone, dto.message);
  }
}
