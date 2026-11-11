import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { PLATFORM_COOKIE, clearSessionCookie, setSessionCookie } from '../../auth/session-cookie';
import { PlatformAuthGuard } from '../../auth/guards/platform-auth.guard';
import { CurrentPlatformActor } from '../../auth/current-actor.decorator';
import type { PlatformActor } from '../../auth/jwt-types';

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? 'unknown';
}

@Controller('platform/auth')
export class PlatformAuthController {
  constructor(private readonly auth: PlatformAuthService) {}

  @Post('login')
  async login(
    @Body() dto: PlatformLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = await this.auth.login(dto.email, dto.password, clientIp(req));
    setSessionCookie(res, req, PLATFORM_COOKIE, token);
    return { ok: true, role: 'platform_admin' };
  }

  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    clearSessionCookie(res, req, PLATFORM_COOKIE);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(PlatformAuthGuard)
  me(@CurrentPlatformActor() actor: PlatformActor) {
    return { role: 'platform_admin', platformAdminId: actor.platformAdminId };
  }
}
