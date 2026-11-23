import { randomBytes } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, eq, ilike, or } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { tenants, tenantUsers } from '../../../db/schema';
import { conflict, notFound } from '../../../common/errors';
import { BillingService, readAdminSettings, type TenantAdminSettings } from '../../billing/billing.service';
import type {
  CreateTenantDto,
  ListTenantsQueryDto,
  UpdateTenantAdminSettingsDto,
  UpdateTenantDto,
} from './dto/tenant.dto';

export type { TenantAdminSettings };

const PASSWORD_HASH_ROUNDS = 12;

/** Readable, high-entropy password — base64url of 9 random bytes gives 12
 * characters with no ambiguous padding, shown once to the platform admin to
 * hand to the client directly instead of routing through an email flow. */
function generatePassword(): string {
  return randomBytes(9).toString('base64url');
}

@Injectable()
export class TenantsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly billing: BillingService,
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

    const [existingUser] = await this.db
      .select({ id: tenantUsers.id })
      .from(tenantUsers)
      .where(eq(tenantUsers.email, dto.adminEmail.toLowerCase()))
      .limit(1);
    if (existingUser) throw conflict('EMAIL_TAKEN', 'A user with that email already exists');

    const [tenant] = await this.db
      .insert(tenants)
      .values({ name: dto.name, slug: dto.slug })
      .returning();

    // A tenant with no admin is a dead end — nobody could ever log into it —
    // so the first admin is created, active, right here as part of tenant
    // creation. No email round-trip: the platform admin sets this tenant up
    // directly and hands the generated password to the client themselves.
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
    const [adminUser] = await this.db
      .insert(tenantUsers)
      .values({
        tenantId: tenant.id,
        email: dto.adminEmail.toLowerCase(),
        passwordHash,
        displayName: dto.adminDisplayName,
        role: 'tenant_admin',
        status: 'active',
      })
      .returning({ id: tenantUsers.id, email: tenantUsers.email, displayName: tenantUsers.displayName });

    return { tenant, adminUser, adminPassword: password };
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
      monthlyBaseFeeCents:
        dto.monthlyBaseFeeCents !== undefined ? dto.monthlyBaseFeeCents : current.monthlyBaseFeeCents,
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

  /** Billable usage for one tenant over a date range — the basis for a
   * monthly invoice. Shared with the tenant's own billing page so both sides
   * always agree on the same number. */
  getUsageSummary(id: string, fromStr?: string, toStr?: string) {
    return this.billing.getUsageSummary(id, fromStr, toStr);
  }

  async remove(id: string) {
    await this.get(id);
    await this.db.delete(tenants).where(eq(tenants.id, id));
    return { ok: true };
  }
}
