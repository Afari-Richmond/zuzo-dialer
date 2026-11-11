import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { voiceCallDirectionEnum, voiceCallStatusEnum } from './enums';
import { tenants } from './tenants';

// Trimmed from the old repo's voice_calls table: drops the inbound-agent
// fields (customerId, identityStatus, recordingConsent, contained) that are
// specific to ZuZo's own inbound voice-AI system, keeping the outbound
// call-tracking core that OutboundDialerService's reconciliation needs.
export const voiceCalls = pgTable(
  'voice_calls',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    callId: text('call_id').notNull(),
    provider: text('provider').notNull().default('stub'),
    providerCallId: text('provider_call_id'),
    direction: voiceCallDirectionEnum('direction').notNull(),
    status: voiceCallStatusEnum('status').notNull().default('ringing'),
    fromNumber: text('from_number'),
    toNumber: text('to_number'),
    campaign: text('campaign'),
    metrics: jsonb('metrics').$type<Record<string, unknown>>(),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('voice_calls_call_id_uidx').on(t.callId),
    index('voice_calls_tenant_provider_call_idx').on(t.tenantId, t.providerCallId),
  ],
);
