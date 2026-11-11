import { boolean, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { campaignTargetStatusEnum } from './enums';
import { tenants } from './tenants';
import { campaigns } from './campaigns';

export const campaignTargets = pgTable(
  'campaign_targets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    phone: text('phone').notNull(),
    name: text('name'),
    reasonNotes: text('reason_notes'),
    providerTargetId: text('provider_target_id'),
    enabled: boolean('enabled').notNull().default(true),
    status: campaignTargetStatusEnum('status').notNull().default('queued'),
    attemptNumber: integer('attempt_number').notNull().default(0),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('campaign_targets_tenant_campaign_idx').on(table.tenantId, table.campaignId),
    index('campaign_targets_tenant_phone_idx').on(table.tenantId, table.phone),
    index('campaign_targets_tenant_status_idx').on(table.tenantId, table.status),
  ],
);
