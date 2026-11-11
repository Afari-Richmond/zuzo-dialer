import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { DncController } from './dnc.controller';
import { DncService } from './dnc.service';

@Module({
  imports: [AuthModule],
  controllers: [DncController],
  providers: [DncService],
  exports: [DncService],
})
export class DncModule {}
