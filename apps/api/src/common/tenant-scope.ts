import { and, eq, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/**
 * Every tenant-scoped query goes through this instead of a bare `eq()` on
 * tenantId — one spot to audit instead of trusting every call site to
 * remember the filter.
 */
export function tenantWhere(
  tenantIdColumn: PgColumn,
  tenantId: string,
  extra?: SQL,
): SQL {
  return extra ? and(eq(tenantIdColumn, tenantId), extra)! : eq(tenantIdColumn, tenantId);
}
