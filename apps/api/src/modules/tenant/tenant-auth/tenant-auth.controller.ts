import { Body, Controller, Get, Post, Req, Res, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Request, Response } from 'express';
import { TenantAuthService } from './tenant-auth.service';
import { TenantLoginDto } from './dto/tenant-login.dto';
import { TENANT_COOKIE, clearSessionCookie, setSessionCookie } from '../../auth/session-cookie';
import { TenantAuthGuard } from '../../auth/guards/tenant-auth.guard';
import { CurrentTenantActor } from '../../auth/current-actor.decorator';
import type { TenantActor } from '../../auth/jwt-types';
import { ApiExceptionFilter } from '../../../common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? 'unknown';
}

@Controller('tenant/auth')
@UseInterceptors(ResponseInterceptor)
@UseFilters(ApiExceptionFilter)
export class TenantAuthController {
  constructor(private readonly auth: TenantAuthService) {}

  @Post('login')
  async login(
    @Body() dto: TenantLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = await this.auth.login(dto.email, dto.password, clientIp(req));
    setSessionCookie(res, req, TENANT_COOKIE, token);
    return { ok: true };
  }

  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    clearSessionCookie(res, req, TENANT_COOKIE);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(TenantAuthGuard)
  me(@CurrentTenantActor() actor: TenantActor) {
    return { tenantId: actor.tenantId, tenantUserId: actor.tenantUserId, role: actor.role };
  }
}
