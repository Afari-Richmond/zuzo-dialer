import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { Database } from '../../../db/client';
import { tenants } from '../../../db/schema';
import { notFound } from '../../../common/errors';
import type { UpdateBrandingDto } from './dto/branding.dto';

export interface TenantBranding {
  logoUrl: string | null;
  primaryColor: string | null;
}

export interface TenantBrandingWithName extends TenantBranding {
  name: string;
}

function readBranding(settings: unknown): TenantBranding {
  const branding = (settings as { branding?: Partial<TenantBranding> } | null)?.branding ?? {};
  return {
    logoUrl: branding.logoUrl ?? null,
    primaryColor: branding.primaryColor ?? null,
  };
}

@Injectable()
export class BrandingService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async get(tenantId: string): Promise<TenantBrandingWithName> {
    const [row] = await this.db
      .select({ name: tenants.name, settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!row) throw notFound('TENANT_NOT_FOUND', 'Tenant not found');
    return { name: row.name, ...readBranding(row.settings) };
  }

  async update(tenantId: string, dto: UpdateBrandingDto): Promise<TenantBranding> {
    const [row] = await this.db
      .select({ settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!row) throw notFound('TENANT_NOT_FOUND', 'Tenant not found');

    const current = readBranding(row.settings);
    const next: TenantBranding = {
      logoUrl: dto.logoUrl !== undefined ? dto.logoUrl || null : current.logoUrl,
      primaryColor: dto.primaryColor !== undefined ? dto.primaryColor || null : current.primaryColor,
    };

    const existingSettings = (row.settings as Record<string, unknown>) ?? {};
    await this.db
      .update(tenants)
      .set({ settings: { ...existingSettings, branding: next } })
      .where(eq(tenants.id, tenantId));

    return next;
  }
}
