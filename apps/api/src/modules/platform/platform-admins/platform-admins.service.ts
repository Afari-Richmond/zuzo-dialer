import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { platformAdmins } from '../../../db/schema';
import { conflict, notFound } from '../../../common/errors';
import type { CreatePlatformAdminDto, UpdatePlatformAdminDto } from './dto/platform-admin.dto';

const PASSWORD_HASH_ROUNDS = 12;

@Injectable()
export class PlatformAdminsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  list() {
    return this.db
      .select({
        id: platformAdmins.id,
        email: platformAdmins.email,
        displayName: platformAdmins.displayName,
        status: platformAdmins.status,
        lastLoginAt: platformAdmins.lastLoginAt,
        createdAt: platformAdmins.createdAt,
      })
      .from(platformAdmins);
  }

  async create(dto: CreatePlatformAdminDto) {
    const [existing] = await this.db
      .select({ id: platformAdmins.id })
      .from(platformAdmins)
      .where(eq(platformAdmins.email, dto.email.toLowerCase()))
      .limit(1);
    if (existing) throw conflict('EMAIL_TAKEN', 'A platform admin with that email already exists');

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_HASH_ROUNDS);
    const [admin] = await this.db
      .insert(platformAdmins)
      .values({ email: dto.email.toLowerCase(), passwordHash, displayName: dto.displayName })
      .returning({
        id: platformAdmins.id,
        email: platformAdmins.email,
        displayName: platformAdmins.displayName,
        status: platformAdmins.status,
      });
    return admin;
  }

  async update(id: string, dto: UpdatePlatformAdminDto) {
    const [existing] = await this.db
      .select({ id: platformAdmins.id })
      .from(platformAdmins)
      .where(eq(platformAdmins.id, id))
      .limit(1);
    if (!existing) throw notFound('PLATFORM_ADMIN_NOT_FOUND', 'Platform admin not found');

    const [admin] = await this.db
      .update(platformAdmins)
      .set({
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      })
      .where(eq(platformAdmins.id, id))
      .returning({
        id: platformAdmins.id,
        email: platformAdmins.email,
        displayName: platformAdmins.displayName,
        status: platformAdmins.status,
      });
    return admin;
  }

  async remove(id: string) {
    const [existing] = await this.db
      .select({ id: platformAdmins.id })
      .from(platformAdmins)
      .where(eq(platformAdmins.id, id))
      .limit(1);
    if (!existing) throw notFound('PLATFORM_ADMIN_NOT_FOUND', 'Platform admin not found');
    await this.db.delete(platformAdmins).where(eq(platformAdmins.id, id));
    return { ok: true };
  }
}
