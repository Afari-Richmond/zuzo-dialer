import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenantUserTokenPurposeEnum } from './enums';
import { tenantUsers } from './tenant-users';

// Only the sha256 hash of the token is ever stored — the raw token exists
// only in the email link, never persisted.
export const tenantUserTokens = pgTable(
  'tenant_user_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantUserId: uuid('tenant_user_id')
      .notNull()
      .references(() => tenantUsers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    purpose: tenantUserTokenPurposeEnum('purpose').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('tenant_user_tokens_hash_idx').on(t.tokenHash),
    index('tenant_user_tokens_user_idx').on(t.tenantUserId),
  ],
);
