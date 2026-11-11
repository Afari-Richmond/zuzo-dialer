import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { voiceOutboundStatusEnum } from './enums';
import { tenants } from './tenants';

// Matches the old single-tenant repo's voice_outbound_attempts table shape
// (campaign is a free-text label, liveHubCampaignId is the LiveHub campaign
// this batch dials through — there is no local "campaigns" table; LiveHub
// owns that entity), tenant-scoped.
export const voiceOutboundAttempts = pgTable(
  'voice_outbound_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    campaign: text('campaign').notNull(),
    liveHubCampaignId: text('live_hub_campaign_id'),
    phone: text('phone').notNull(),
    name: text('name'),
    reason: text('reason'),
    status: voiceOutboundStatusEnum('status').notNull().default('queued'),
    attemptNumber: integer('attempt_number').notNull().default(1),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    callId: text('call_id'),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('voice_outbound_tenant_phone_campaign_idx').on(t.tenantId, t.phone, t.campaign),
    index('voice_outbound_tenant_status_idx').on(t.tenantId, t.status),
    index('voice_outbound_tenant_livehub_campaign_idx').on(t.tenantId, t.liveHubCampaignId),
  ],
);
