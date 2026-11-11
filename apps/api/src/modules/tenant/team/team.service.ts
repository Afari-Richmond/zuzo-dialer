import { randomBytes } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { tenantUsers, tenants } from '../../../db/schema';
import { conflict, notFound } from '../../../common/errors';
import { tenantWhere } from '../../../common/tenant-scope';
import { TenantUserTokensService } from '../tenant-auth/tenant-user-tokens.service';
import { EmailService } from '../../email/email.service';
import { ConfigService } from '@nestjs/config';
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

@Injectable()
export class TeamService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tokens: TenantUserTokensService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

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

    // Unusable placeholder hash — the real password is set by the user via
    // the invite-acceptance flow, never disclosed by the inviter.
    const placeholderHash = await bcrypt.hash(randomBytes(24).toString('hex'), PASSWORD_HASH_ROUNDS);
    const [user] = await this.db
      .insert(tenantUsers)
      .values({
        tenantId,
        email: dto.email.toLowerCase(),
        passwordHash: placeholderHash,
        displayName: dto.displayName,
        role: dto.role,
        status: 'invited',
        invitedAt: new Date(),
      })
      .returning(METADATA_COLUMNS);

    const [tenant] = await this.db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const token = await this.tokens.issueInvite(user.id);
    const baseUrl = this.config.get<string>('TENANT_WEB_URL') || 'http://localhost:5174';
    const acceptUrl = `${baseUrl}/outreach/accept-invite?token=${token}`;
    await this.email.sendInvite(user.email, tenant?.name ?? 'your team', acceptUrl);

    return { user };
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
