import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { PlatformAuthGuard } from '../../auth/guards/platform-auth.guard';
import { TenantsService } from './tenants.service';
import {
  CreateTenantDto,
  ListTenantsQueryDto,
  UpdateTenantAdminSettingsDto,
  UpdateTenantDto,
} from './dto/tenant.dto';

@Controller('platform/tenants')
@UseGuards(PlatformAuthGuard)
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  list(@Query() query: ListTenantsQueryDto) {
    return this.tenants.list(query).then((tenants) => ({ tenants }));
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenants.get(id).then((tenant) => ({ tenant }));
  }

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenants.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(id, dto).then((tenant) => ({ tenant }));
  }

  @Get(':id/admin-settings')
  getAdminSettings(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenants.getAdminSettings(id).then((adminSettings) => ({ adminSettings }));
  }

  @Put(':id/admin-settings')
  updateAdminSettings(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantAdminSettingsDto) {
    return this.tenants.updateAdminSettings(id, dto).then((adminSettings) => ({ adminSettings }));
  }

  @Post(':id/suspend')
  suspend(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenants.setStatus(id, 'suspended').then((tenant) => ({ tenant }));
  }

  @Post(':id/activate')
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenants.setStatus(id, 'active').then((tenant) => ({ tenant }));
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenants.remove(id);
  }
}
