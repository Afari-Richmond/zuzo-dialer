import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './db/database.module';
import { HealthModule } from './modules/health/health.module';
import { PlatformAuthModule } from './modules/platform/platform-auth/platform-auth.module';
import { TenantAuthModule } from './modules/tenant/tenant-auth/tenant-auth.module';
import { TenantsModule } from './modules/platform/tenants/tenants.module';
import { PlatformAdminsModule } from './modules/platform/platform-admins/platform-admins.module';
import { PlatformStatsModule } from './modules/platform/platform-stats/platform-stats.module';
import { VoiceModule } from './modules/voice/voice.module';
import { OutboundDialerModule } from './modules/voice/outbound-dialer.module';
import { TelephonyCredentialsModule } from './modules/tenant/telephony-credentials/telephony-credentials.module';
import { DncModule } from './modules/tenant/dnc/dnc.module';
import { CampaignsModule } from './modules/tenant/campaigns/campaigns.module';
import { ContactsModule } from './modules/tenant/contacts/contacts.module';
import { TeamModule } from './modules/tenant/team/team.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    HealthModule,
    PlatformAuthModule,
    TenantAuthModule,
    TenantsModule,
    PlatformAdminsModule,
    PlatformStatsModule,
    VoiceModule,
    OutboundDialerModule,
    TelephonyCredentialsModule,
    DncModule,
    CampaignsModule,
    ContactsModule,
    TeamModule,
  ],
})
export class AppModule {}
