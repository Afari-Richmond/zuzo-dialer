import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './db/database.module';
import { HealthModule } from './modules/health/health.module';
import { PlatformAuthModule } from './modules/platform/platform-auth/platform-auth.module';
import { TenantAuthModule } from './modules/tenant/tenant-auth/tenant-auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    HealthModule,
    PlatformAuthModule,
    TenantAuthModule,
  ],
})
export class AppModule {}
