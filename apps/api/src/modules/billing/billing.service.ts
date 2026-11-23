import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, isNotNull, lte, ne, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../db/database.module';
import type { Database } from '../../db/client';
import { tenants, voiceCalls } from '../../db/schema';
import { notFound } from '../../common/errors';

export interface TenantAdminSettings {
  plan: 'trial' | 'starter' | 'growth' | 'scale' | 'custom';
  monthlyMinuteQuota: number | null;
  ratePerMinuteCents: number | null;
  monthlyBaseFeeCents: number | null;
  billingContactName: string | null;
  billingContactEmail: string | null;
  notes: string | null;
}

export function readAdminSettings(settings: unknown): TenantAdminSettings {
  const admin = (settings as { admin?: Partial<TenantAdminSettings> } | null)?.admin ?? {};
  return {
    plan: admin.plan ?? 'trial',
    monthlyMinuteQuota: admin.monthlyMinuteQuota ?? null,
    ratePerMinuteCents: admin.ratePerMinuteCents ?? null,
    monthlyBaseFeeCents: admin.monthlyBaseFeeCents ?? null,
    billingContactName: admin.billingContactName ?? null,
    billingContactEmail: admin.billingContactEmail ?? null,
    notes: admin.notes ?? null,
  };
}

/** Alert threshold is fixed at 80% of included minutes — no per-tenant
 * configuration yet, since nobody has asked for one. */
const WARNING_THRESHOLD = 0.8;

export type UsageAlertLevel = 'none' | 'warning' | 'over';

/** Shared between the platform admin's per-tenant usage panel and the
 * tenant's own billing page, so both sides always agree on the same number —
 * real call minutes from voice_calls, billed against the plan the admin set. */
@Injectable()
export class BillingService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async getAdminSettings(tenantId: string): Promise<TenantAdminSettings> {
    const [tenant] = await this.db
      .select({ settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!tenant) throw notFound('TENANT_NOT_FOUND', 'Tenant not found');
    return readAdminSettings(tenant.settings);
  }

  async getUsageSummary(tenantId: string, fromStr?: string, toStr?: string) {
    const now = new Date();
    const from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = toStr ? new Date(`${toStr}T23:59:59.999Z`) : now;

    const settings = await this.getAdminSettings(tenantId);

    const [row] = await this.db
      .select({
        callCount: sql<number>`count(*)::int`,
        totalMinutes: sql<number>`coalesce(sum(ceil(extract(epoch from (${voiceCalls.endedAt} - ${voiceCalls.startedAt})) / 60)), 0)::int`,
      })
      .from(voiceCalls)
      .where(
        and(
          eq(voiceCalls.tenantId, tenantId),
          ne(voiceCalls.provider, 'stub'),
          isNotNull(voiceCalls.endedAt),
          gte(voiceCalls.startedAt, from),
          lte(voiceCalls.startedAt, to),
        ),
      );

    const totalMinutes = row?.callCount ? row.totalMinutes : 0;
    const includedMinutes = settings.monthlyMinuteQuota ?? 0;
    const overageMinutes = Math.max(0, totalMinutes - includedMinutes);
    const overageCostCents = overageMinutes * (settings.ratePerMinuteCents ?? 0);
    const baseFeeCents = settings.monthlyBaseFeeCents ?? 0;
    const hasQuota = settings.monthlyMinuteQuota != null && settings.monthlyMinuteQuota > 0;
    const usedFraction = hasQuota ? totalMinutes / (settings.monthlyMinuteQuota as number) : 0;

    let alertLevel: UsageAlertLevel = 'none';
    if (overageMinutes > 0) alertLevel = 'over';
    else if (hasQuota && usedFraction >= WARNING_THRESHOLD) alertLevel = 'warning';

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      callCount: row?.callCount ?? 0,
      totalMinutes,
      includedMinutes,
      overageMinutes,
      baseFeeCents,
      ratePerMinuteCents: settings.ratePerMinuteCents ?? 0,
      overageCostCents,
      totalDueCents: baseFeeCents + overageCostCents,
      alertLevel,
    };
  }
}
