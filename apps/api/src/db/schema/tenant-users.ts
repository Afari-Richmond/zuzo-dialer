import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { tenantUserRoleEnum, tenantUserStatusEnum } from './enums';
import { tenants } from './tenants';

export const tenantUsers = pgTable(
  'tenant_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    role: tenantUserRoleEnum('role').notNull().default('agent'),
    status: tenantUserStatusEnum('status').notNull().default('invited'),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('tenant_users_email_key').on(table.email),
    index('tenant_users_tenant_status_idx').on(table.tenantId, table.status),
  ],
);
