import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { VoiceModule } from '../../voice/voice.module';
import { TelephonyCredentialsController } from './telephony-credentials.controller';
import { TelephonyCredentialsService } from './telephony-credentials.service';

@Module({
  imports: [AuthModule, VoiceModule],
  controllers: [TelephonyCredentialsController],
  providers: [TelephonyCredentialsService],
})
export class TelephonyCredentialsModule {}
