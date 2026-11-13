DROP TABLE "tenant_agent_definitions" CASCADE;--> statement-breakpoint
ALTER TABLE "voice_campaign_reports" ADD COLUMN "tool_names" jsonb;--> statement-breakpoint
ALTER TABLE "voice_campaign_reports" ADD COLUMN "document_ids" jsonb;