import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { VoiceModule } from '../../voice/voice.module';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';

@Module({
  imports: [AuthModule, VoiceModule],
  controllers: [AiAgentController],
  providers: [AiAgentService],
})
export class AiAgentModule {}
