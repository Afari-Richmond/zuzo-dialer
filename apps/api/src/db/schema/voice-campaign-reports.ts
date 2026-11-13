import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
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
  // post-campaign staff review note, not call-time input. Also pushed
  // directly as the live agent's prompt when saved (see
  // OutreachService.setAiContext) — whichever campaign's AI settings were
  // saved most recently is what the shared agent actually runs on calls.
  aiContext: text('ai_context'),
  // Tool names and document ids this campaign wants the agent to have —
  // pushed to the agent's tools_config/documents alongside the prompt.
  toolNames: jsonb('tool_names').$type<string[]>(),
  documentIds: jsonb('document_ids').$type<string[]>(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
