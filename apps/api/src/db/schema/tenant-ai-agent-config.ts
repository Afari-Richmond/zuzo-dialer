import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// Which of the tenant's LiveHub AI Agents backs their outreach bot — chosen
// from a live list (GET /ai-framework-management/api/v1/agents), not
// inferred, since agent IDs live in a different ID space than the
// campaignDialer bot names already stored on LiveHubCredentials.
export const tenantAiAgentConfig = pgTable('tenant_ai_agent_config', {
  tenantId: uuid('tenant_id')
    .primaryKey()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  agentId: text('agent_id'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
