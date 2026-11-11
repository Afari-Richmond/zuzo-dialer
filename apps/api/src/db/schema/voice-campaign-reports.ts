import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const voiceCampaignReports = pgTable('voice_campaign_reports', {
  liveHubCampaignId: text('live_hub_campaign_id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  recommendation: text('recommendation'),
  // Operational context for the AI voice bot — industry, product, tone, talking
  // points — merged into botMetadata on every call for this campaign, alongside
  // the per-contact `reason`. Distinct from `recommendation`, which is a
  // post-campaign staff review note, not call-time input.
  aiContext: text('ai_context'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
