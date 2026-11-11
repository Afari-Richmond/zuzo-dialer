import { randomBytes } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { tenantUsers } from '../../../db/schema';
import { conflict, notFound } from '../../../common/errors';
import { tenantWhere } from '../../../common/tenant-scope';
import type { InviteTenantUserDto, UpdateTenantUserDto } from './dto/team.dto';

const PASSWORD_HASH_ROUNDS = 12;
const METADATA_COLUMNS = {
  id: tenantUsers.id,
  email: tenantUsers.email,
  displayName: tenantUsers.displayName,
  role: tenantUsers.role,
  status: tenantUsers.status,
  lastLoginAt: tenantUsers.lastLoginAt,
  createdAt: tenantUsers.createdAt,
};

function generateTempPassword(): string {
  return randomBytes(9).toString('base64url');
}

@Injectable()
export class TeamService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  list(tenantId: string) {
    return this.db
      .select(METADATA_COLUMNS)
      .from(tenantUsers)
      .where(tenantWhere(tenantUsers.tenantId, tenantId));
  }

  async invite(tenantId: string, dto: InviteTenantUserDto) {
    const [existing] = await this.db
      .select({ id: tenantUsers.id })
      .from(tenantUsers)
      .where(eq(tenantUsers.email, dto.email.toLowerCase()))
      .limit(1);
    if (existing) throw conflict('EMAIL_TAKEN', 'A user with that email already exists');

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, PASSWORD_HASH_ROUNDS);
    const [user] = await this.db
      .insert(tenantUsers)
      .values({
        tenantId,
        email: dto.email.toLowerCase(),
        passwordHash,
        displayName: dto.displayName,
        role: dto.role,
        status: 'active',
        invitedAt: new Date(),
      })
      .returning(METADATA_COLUMNS);

    // Shown once — there is no email-invite flow yet, so the tenant admin
    // shares this with the new user out of band.
    return { user, tempPassword };
  }

  async update(tenantId: string, id: string, dto: UpdateTenantUserDto) {
    const [existing] = await this.db
      .select({ id: tenantUsers.id })
      .from(tenantUsers)
      .where(and(tenantWhere(tenantUsers.tenantId, tenantId), eq(tenantUsers.id, id)))
      .limit(1);
    if (!existing) throw notFound('TEAM_MEMBER_NOT_FOUND', 'Team member not found');

    const [user] = await this.db
      .update(tenantUsers)
      .set({
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      })
      .where(eq(tenantUsers.id, id))
      .returning(METADATA_COLUMNS);
    return user;
  }
}
