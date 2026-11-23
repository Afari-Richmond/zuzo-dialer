import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { tenantUsers } from './tenant-users';

// One active key per tenant — generating a new one replaces the old, same
// "shown once, never retrievable again" model already used for LiveHub's own
// API clients. keyHash is sha256 of the raw key; keyPrefix is the first 8
// characters of the raw key, kept in the clear so the UI can show which key
// is active without ever storing or re-displaying the full value.
export const tenantApiKeys = pgTable('tenant_api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .unique()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  keyHash: text('key_hash').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  createdBy: uuid('created_by').references(() => tenantUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
});
