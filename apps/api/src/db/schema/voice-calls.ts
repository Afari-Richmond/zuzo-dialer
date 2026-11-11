import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { voiceCallDirectionEnum, voiceCallStatusEnum } from './enums';
import { tenants } from './tenants';
import { campaigns } from './campaigns';
import { campaignTargets } from './campaign-targets';

export const voiceCalls = pgTable(
  'voice_calls',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
    targetId: uuid('target_id').references(() => campaignTargets.id, { onDelete: 'set null' }),
    callId: text('call_id').notNull(),
    provider: text('provider').notNull(),
    providerCallId: text('provider_call_id'),
    direction: voiceCallDirectionEnum('direction').notNull(),
    status: voiceCallStatusEnum('status').notNull().default('ringing'),
    fromNumber: text('from_number'),
    toNumber: text('to_number'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    metrics: jsonb('metrics').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('voice_calls_tenant_started_idx').on(table.tenantId, table.startedAt)],
);
