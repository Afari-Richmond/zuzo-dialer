import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { EmailModule } from '../../email/email.module';
import { TenantAuthModule } from '../tenant-auth/tenant-auth.module';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  imports: [AuthModule, EmailModule, TenantAuthModule],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
