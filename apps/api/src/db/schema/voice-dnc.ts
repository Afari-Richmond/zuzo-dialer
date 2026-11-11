import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// Matches the old single-tenant repo's voice_dnc table shape, tenant-scoped.
export const voiceDnc = pgTable(
  'voice_dnc',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    phone: text('phone').notNull(),
    reason: text('reason'),
    source: text('source').notNull().default('manual'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('voice_dnc_tenant_phone_key').on(t.tenantId, t.phone)],
);
