import { Module } from '@nestjs/common';
import { CredentialsCryptoService } from './credentials-crypto.service';
import { VoiceAdapterFactoryService } from './voice-adapter-factory.service';

@Module({
  providers: [CredentialsCryptoService, VoiceAdapterFactoryService],
  exports: [CredentialsCryptoService, VoiceAdapterFactoryService],
})
export class VoiceModule {}
