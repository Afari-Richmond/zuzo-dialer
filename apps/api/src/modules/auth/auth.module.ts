import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtSigningService } from './jwt-signing.service';
import { LoginRateLimiterService } from './login-rate-limiter.service';
import { PlatformAuthGuard } from './guards/platform-auth.guard';
import { TenantAuthGuard } from './guards/tenant-auth.guard';
import { TenantRolesGuard } from './guards/tenant-roles.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'dev-only-jwt-secret-change-me',
      }),
    }),
  ],
  providers: [
    JwtSigningService,
    LoginRateLimiterService,
    PlatformAuthGuard,
    TenantAuthGuard,
    TenantRolesGuard,
  ],
  exports: [
    JwtModule,
    JwtSigningService,
    LoginRateLimiterService,
    PlatformAuthGuard,
    TenantAuthGuard,
    TenantRolesGuard,
  ],
})
export class AuthModule {}
