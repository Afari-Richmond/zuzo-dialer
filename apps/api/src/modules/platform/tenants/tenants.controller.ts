import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PlatformAuthGuard } from '../../auth/guards/platform-auth.guard';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, ListTenantsQueryDto, UpdateTenantDto } from './dto/tenant.dto';

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
    return this.tenants.create(dto).then((tenant) => ({ tenant }));
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(id, dto).then((tenant) => ({ tenant }));
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
