import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ilike, or } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { tenants } from '../../../db/schema';
import { conflict, notFound } from '../../../common/errors';
import { TeamService } from '../../tenant/team/team.service';
import type {
  CreateTenantDto,
  ListTenantsQueryDto,
  UpdateTenantAdminSettingsDto,
  UpdateTenantDto,
} from './dto/tenant.dto';

export interface TenantAdminSettings {
  plan: 'trial' | 'starter' | 'growth' | 'scale' | 'custom';
  monthlyMinuteQuota: number | null;
  ratePerMinuteCents: number | null;
  billingContactName: string | null;
  billingContactEmail: string | null;
  notes: string | null;
}

function readAdminSettings(settings: unknown): TenantAdminSettings {
  const admin = (settings as { admin?: Partial<TenantAdminSettings> } | null)?.admin ?? {};
  return {
    plan: admin.plan ?? 'trial',
    monthlyMinuteQuota: admin.monthlyMinuteQuota ?? null,
    ratePerMinuteCents: admin.ratePerMinuteCents ?? null,
    billingContactName: admin.billingContactName ?? null,
    billingContactEmail: admin.billingContactEmail ?? null,
    notes: admin.notes ?? null,
  };
}

@Injectable()
export class TenantsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly team: TeamService,
  ) {}

  async list(query: ListTenantsQueryDto) {
    const conditions = [
      query.status ? eq(tenants.status, query.status) : undefined,
      query.q ? or(ilike(tenants.name, `%${query.q}%`), ilike(tenants.slug, `%${query.q}%`)) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);
    return this.db
      .select()
      .from(tenants)
      .where(conditions.length ? and(...conditions) : undefined);
  }

  async get(id: string) {
    const [tenant] = await this.db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!tenant) throw notFound('TENANT_NOT_FOUND', 'Tenant not found');
    return tenant;
  }

  async create(dto: CreateTenantDto) {
    const [existing] = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, dto.slug))
      .limit(1);
    if (existing) throw conflict('TENANT_SLUG_TAKEN', 'That slug is already in use');

    const [tenant] = await this.db
      .insert(tenants)
      .values({ name: dto.name, slug: dto.slug })
      .returning();

    // A tenant with no admin is a dead end — nobody could ever log into it —
    // so the first admin is invited as part of creation, not a separate
    // manual step. If the invite fails (e.g. email already in use), the
    // tenant row is rolled back rather than left orphaned with no way in.
    try {
      const { user } = await this.team.invite(tenant.id, {
        email: dto.adminEmail,
        displayName: dto.adminDisplayName,
        role: 'tenant_admin',
      });
      return { tenant, adminUser: user };
    } catch (err) {
      await this.db.delete(tenants).where(eq(tenants.id, tenant.id));
      throw err;
    }
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.get(id);
    const [tenant] = await this.db
      .update(tenants)
      .set({ ...(dto.name !== undefined ? { name: dto.name } : {}), ...(dto.settings !== undefined ? { settings: dto.settings } : {}) })
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  }

  async setStatus(id: string, status: 'active' | 'suspended' | 'trial') {
    await this.get(id);
    const [tenant] = await this.db
      .update(tenants)
      .set({ status })
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  }

  async getAdminSettings(id: string): Promise<TenantAdminSettings> {
    const tenant = await this.get(id);
    return readAdminSettings(tenant.settings);
  }

  async updateAdminSettings(id: string, dto: UpdateTenantAdminSettingsDto): Promise<TenantAdminSettings> {
    const tenant = await this.get(id);
    const current = readAdminSettings(tenant.settings);
    const next: TenantAdminSettings = {
      plan: dto.plan !== undefined ? dto.plan : current.plan,
      monthlyMinuteQuota: dto.monthlyMinuteQuota !== undefined ? dto.monthlyMinuteQuota : current.monthlyMinuteQuota,
      ratePerMinuteCents: dto.ratePerMinuteCents !== undefined ? dto.ratePerMinuteCents : current.ratePerMinuteCents,
      billingContactName: dto.billingContactName !== undefined ? dto.billingContactName : current.billingContactName,
      billingContactEmail: dto.billingContactEmail !== undefined ? dto.billingContactEmail : current.billingContactEmail,
      notes: dto.notes !== undefined ? dto.notes : current.notes,
    };

    const existingSettings = (tenant.settings as Record<string, unknown>) ?? {};
    await this.db
      .update(tenants)
      .set({ settings: { ...existingSettings, admin: next } })
      .where(eq(tenants.id, id));

    return next;
  }

  async remove(id: string) {
    await this.get(id);
    await this.db.delete(tenants).where(eq(tenants.id, id));
    return { ok: true };
  }
}
