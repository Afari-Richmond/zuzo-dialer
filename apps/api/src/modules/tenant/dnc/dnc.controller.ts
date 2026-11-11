import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { TenantAuthGuard } from '../../auth/guards/tenant-auth.guard';
import { CurrentTenantActor } from '../../auth/current-actor.decorator';
import type { TenantActor } from '../../auth/jwt-types';
import { DncService } from './dnc.service';
import { AddDncDto } from './dto/dnc.dto';

@Controller('tenant/dnc')
@UseGuards(TenantAuthGuard)
export class DncController {
  constructor(private readonly dnc: DncService) {}

  @Get()
  list(@CurrentTenantActor() actor: TenantActor) {
    return this.dnc.list(actor.tenantId).then((entries) => ({ entries }));
  }

  @Post()
  add(@CurrentTenantActor() actor: TenantActor, @Body() dto: AddDncDto) {
    return this.dnc.add(actor.tenantId, dto).then((entry) => ({ entry }));
  }

  @Delete(':id')
  remove(@CurrentTenantActor() actor: TenantActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.dnc.remove(actor.tenantId, id);
  }
}
