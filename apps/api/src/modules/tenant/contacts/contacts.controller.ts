import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TenantAuthGuard } from '../../auth/guards/tenant-auth.guard';
import { CurrentTenantActor } from '../../auth/current-actor.decorator';
import type { TenantActor } from '../../auth/jwt-types';
import { ContactsService } from './contacts.service';
import { badRequest } from '../../../common/errors';

@Controller('tenant/campaigns/:id/contacts')
@UseGuards(TenantAuthGuard)
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentTenantActor() actor: TenantActor,
    @Param('id', ParseUUIDPipe) campaignId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw badRequest('MISSING_FILE', 'No file uploaded (expected field name "file")');
    return this.contacts.uploadBatch(actor.tenantId, campaignId, file.buffer);
  }
}
