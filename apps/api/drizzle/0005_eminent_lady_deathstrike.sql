CREATE TABLE "tenant_agent_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"prompt" text DEFAULT '' NOT NULL,
	"llm" text,
	"voice" text,
	"tool_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"document_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"transfer_phone" text,
	"transfer_message" text,
	"transfer_patterns" jsonb,
	"is_deployed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_agent_definitions" ADD CONSTRAINT "tenant_agent_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;