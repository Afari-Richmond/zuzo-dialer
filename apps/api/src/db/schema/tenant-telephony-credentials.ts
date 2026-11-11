import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { telephonyProviderEnum } from './enums';
import { tenants } from './tenants';
import { tenantUsers } from './tenant-users';

// Credential material is stored encrypted (AES-256-GCM); the three byte
// columns are written/read only by CredentialsCryptoService (lands in M3).
// This table is schema-only for M1 — no encrypt/decrypt code wired yet.
export const tenantTelephonyCredentials = pgTable(
  'tenant_telephony_credentials',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    provider: telephonyProviderEnum('provider').notNull(),
    label: text('label').notNull(),
    iv: text('iv'),
    authTag: text('auth_tag'),
    ciphertext: text('ciphertext'),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by').references(() => tenantUsers.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('tenant_telephony_credentials_tenant_idx').on(table.tenantId),
    uniqueIndex('tenant_telephony_credentials_active_provider_key')
      .on(table.tenantId, table.provider)
      .where(sql`${table.isActive} = true`),
  ],
);
