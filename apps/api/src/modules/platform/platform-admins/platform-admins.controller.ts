import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { PlatformAuthGuard } from '../../auth/guards/platform-auth.guard';
import { PlatformAdminsService } from './platform-admins.service';
import { CreatePlatformAdminDto, UpdatePlatformAdminDto } from './dto/platform-admin.dto';

@Controller('platform/platform-admins')
@UseGuards(PlatformAuthGuard)
export class PlatformAdminsController {
  constructor(private readonly admins: PlatformAdminsService) {}

  @Get()
  list() {
    return this.admins.list().then((admins) => ({ admins }));
  }

  @Post()
  create(@Body() dto: CreatePlatformAdminDto) {
    return this.admins.create(dto).then((admin) => ({ admin }));
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePlatformAdminDto) {
    return this.admins.update(id, dto).then((admin) => ({ admin }));
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.admins.remove(id);
  }
}
