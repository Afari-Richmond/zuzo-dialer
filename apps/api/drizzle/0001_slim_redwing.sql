CREATE TYPE "public"."campaign_next_step" AS ENUM('schedule_follow_up', 'send_email_sms', 'escalate_to_agent', 'add_to_dnc', 'no_action_needed');--> statement-breakpoint
CREATE TYPE "public"."campaign_outcome" AS ENUM('interested', 'not_interested', 'callback_requested', 'wrong_number', 'converted', 'no_decision_yet', 'other');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'running', 'locked', 'completed', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."campaign_target_status" AS ENUM('queued', 'dialing', 'answered', 'machine', 'no_answer', 'failed', 'completed', 'dnc', 'outside_window');--> statement-breakpoint
CREATE TYPE "public"."voice_call_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."voice_call_status" AS ENUM('ringing', 'in_progress', 'completed', 'failed', 'transferred', 'voicemail', 'no_answer', 'busy');--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"credential_id" uuid NOT NULL,
	"provider_campaign_id" text,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"schedule" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"default_bot_id" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"name" text,
	"reason_notes" text,
	"provider_target_id" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"status" "campaign_target_status" DEFAULT 'queued' NOT NULL,
	"attempt_number" integer DEFAULT 0 NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"outcome" "campaign_outcome",
	"next_step" "campaign_next_step",
	"notes" text,
	"logged_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_reports" (
	"campaign_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"recommendation" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campaign_id" uuid,
	"target_id" uuid,
	"call_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_call_id" text,
	"direction" "voice_call_direction" NOT NULL,
	"status" "voice_call_status" DEFAULT 'ringing' NOT NULL,
	"from_number" text,
	"to_number" text,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dnc_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"reason" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_credential_id_tenant_telephony_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."tenant_telephony_credentials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_tenant_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."tenant_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_targets" ADD CONSTRAINT "campaign_targets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_targets" ADD CONSTRAINT "campaign_targets_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_outcomes" ADD CONSTRAINT "call_outcomes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_outcomes" ADD CONSTRAINT "call_outcomes_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_outcomes" ADD CONSTRAINT "call_outcomes_target_id_campaign_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."campaign_targets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_outcomes" ADD CONSTRAINT "call_outcomes_logged_by_user_id_tenant_users_id_fk" FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."tenant_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_reports" ADD CONSTRAINT "campaign_reports_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_reports" ADD CONSTRAINT "campaign_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_target_id_campaign_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."campaign_targets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dnc_entries" ADD CONSTRAINT "dnc_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaigns_tenant_status_idx" ON "campaigns" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "campaign_targets_tenant_campaign_idx" ON "campaign_targets" USING btree ("tenant_id","campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_targets_tenant_phone_idx" ON "campaign_targets" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX "campaign_targets_tenant_status_idx" ON "campaign_targets" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "call_outcomes_campaign_target_key" ON "call_outcomes" USING btree ("campaign_id","target_id");--> statement-breakpoint
CREATE INDEX "call_outcomes_tenant_campaign_idx" ON "call_outcomes" USING btree ("tenant_id","campaign_id");--> statement-breakpoint
CREATE INDEX "voice_calls_tenant_started_idx" ON "voice_calls" USING btree ("tenant_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dnc_entries_tenant_phone_key" ON "dnc_entries" USING btree ("tenant_id","phone");