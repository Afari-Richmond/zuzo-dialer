CREATE TABLE "tenant_ai_agent_config" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"agent_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_ai_agent_config" ADD CONSTRAINT "tenant_ai_agent_config_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;