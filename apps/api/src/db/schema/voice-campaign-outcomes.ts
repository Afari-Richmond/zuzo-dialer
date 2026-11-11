import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { campaignNextStepEnum, campaignOutcomeEnum } from './enums';
import { tenants } from './tenants';

export const voiceCampaignOutcomes = pgTable(
  'voice_campaign_outcomes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    liveHubCampaignId: text('live_hub_campaign_id').notNull(),
    targetId: text('target_id').notNull(),
    phone: text('phone').notNull(),
    outcome: campaignOutcomeEnum('outcome'),
    nextStep: campaignNextStepEnum('next_step'),
    notes: text('notes'),
    loggedBy: text('logged_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('voice_campaign_outcomes_target_uidx').on(t.liveHubCampaignId, t.targetId),
    index('voice_campaign_outcomes_tenant_campaign_idx').on(t.tenantId, t.liveHubCampaignId),
  ],
);
