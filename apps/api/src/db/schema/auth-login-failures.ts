import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { authLoginScopeEnum } from './enums';

// DB-backed login rate limiting — deliberately not an in-memory Map, so
// counts survive restarts and are shared across multiple API instances.
export const authLoginFailures = pgTable(
  'auth_login_failures',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scopeType: authLoginScopeEnum('scope_type').notNull(),
    identifierHash: text('identifier_hash').notNull(),
    failureCount: integer('failure_count').notNull().default(0),
    windowResetAt: timestamp('window_reset_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('auth_login_failures_scope_identifier_key').on(
      table.scopeType,
      table.identifierHash,
    ),
  ],
);
