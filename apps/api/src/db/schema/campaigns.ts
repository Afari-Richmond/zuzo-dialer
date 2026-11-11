import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { campaignStatusEnum } from './enums';
import { tenants } from './tenants';
import { tenantUsers } from './tenant-users';
import { tenantTelephonyCredentials } from './tenant-telephony-credentials';

export const campaigns = pgTable(
  'campaigns',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    credentialId: uuid('credential_id')
      .notNull()
      .references(() => tenantTelephonyCredentials.id, { onDelete: 'restrict' }),
    providerCampaignId: text('provider_campaign_id'),
    status: campaignStatusEnum('status').notNull().default('draft'),
    schedule: jsonb('schedule').notNull().default({}),
    defaultBotId: text('default_bot_id'),
    createdBy: uuid('created_by').references(() => tenantUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('campaigns_tenant_status_idx').on(table.tenantId, table.status),
  ],
);
