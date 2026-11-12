import { integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// Backs IdempotencyInterceptor: a client resends a mutating request (its own
// retry after a timeout, a double-click, a flaky connection) with the same
// Idempotency-Key header, and gets the original response back instead of
// the side effect running twice — e.g. a "Call now" click that would
// otherwise dial the same number again.
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    route: text('route').notNull(),
    status: text('status').notNull().default('in_progress'), // 'in_progress' | 'completed'
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body').$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('idempotency_tenant_key_route_uidx').on(t.tenantId, t.key, t.route)],
);
