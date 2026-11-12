import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { TeamModule } from '../../tenant/team/team.module';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [AuthModule, TeamModule],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
