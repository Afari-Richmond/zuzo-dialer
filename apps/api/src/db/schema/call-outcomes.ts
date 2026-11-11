import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { campaignNextStepEnum, campaignOutcomeEnum } from './enums';
import { tenants } from './tenants';
import { campaigns } from './campaigns';
import { campaignTargets } from './campaign-targets';
import { tenantUsers } from './tenant-users';

export const callOutcomes = pgTable(
  'call_outcomes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    targetId: uuid('target_id')
      .notNull()
      .references(() => campaignTargets.id, { onDelete: 'cascade' }),
    phone: text('phone').notNull(),
    outcome: campaignOutcomeEnum('outcome'),
    nextStep: campaignNextStepEnum('next_step'),
    notes: text('notes'),
    loggedByUserId: uuid('logged_by_user_id').references(() => tenantUsers.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('call_outcomes_campaign_target_key').on(table.campaignId, table.targetId),
    index('call_outcomes_tenant_campaign_idx').on(table.tenantId, table.campaignId),
  ],
);
