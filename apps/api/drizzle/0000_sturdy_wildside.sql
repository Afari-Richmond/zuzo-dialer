CREATE TYPE "public"."auth_login_scope" AS ENUM('platform', 'tenant');--> statement-breakpoint
CREATE TYPE "public"."campaign_next_step" AS ENUM('schedule_follow_up', 'send_email_sms', 'escalate_to_agent', 'add_to_dnc', 'no_action_needed');--> statement-breakpoint
CREATE TYPE "public"."campaign_outcome" AS ENUM('interested', 'not_interested', 'callback_requested', 'wrong_number', 'converted', 'no_decision_yet', 'other');--> statement-breakpoint
CREATE TYPE "public"."platform_admin_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."telephony_provider" AS ENUM('livehub', 'twilio', 'africastalking', 'stub');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('trial', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."tenant_user_role" AS ENUM('tenant_admin', 'agent');--> statement-breakpoint
CREATE TYPE "public"."tenant_user_status" AS ENUM('invited', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."voice_call_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."voice_call_status" AS ENUM('ringing', 'in_progress', 'completed', 'failed', 'transferred', 'voicemail', 'no_answer', 'busy');--> statement-breakpoint
CREATE TYPE "public"."voice_outbound_status" AS ENUM('queued', 'dialing', 'answered', 'machine', 'no_answer', 'failed', 'completed', 'dnc', 'outside_window');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "tenant_status" DEFAULT 'trial' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "platform_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"status" "platform_admin_status" DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "tenant_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"role" "tenant_user_role" DEFAULT 'agent' NOT NULL,
	"status" "tenant_user_status" DEFAULT 'invited' NOT NULL,
	"invited_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_telephony_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" "telephony_provider" NOT NULL,
	"label" text NOT NULL,
	"iv" text,
	"auth_tag" text,
	"ciphertext" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_login_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" "auth_login_scope" NOT NULL,
	"identifier_hash" text NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"window_reset_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_dnc" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"reason" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_outbound_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campaign" text NOT NULL,
	"live_hub_campaign_id" text,
	"phone" text NOT NULL,
	"name" text,
	"reason" text,
	"status" "voice_outbound_status" DEFAULT 'queued' NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"call_id" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_campaign_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"live_hub_campaign_id" text NOT NULL,
	"target_id" text NOT NULL,
	"phone" text NOT NULL,
	"outcome" "campaign_outcome",
	"next_step" "campaign_next_step",
	"notes" text,
	"logged_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_campaign_reports" (
	"live_hub_campaign_id" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"recommendation" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"call_id" text NOT NULL,
	"provider" text DEFAULT 'stub' NOT NULL,
	"provider_call_id" text,
	"direction" "voice_call_direction" NOT NULL,
	"status" "voice_call_status" DEFAULT 'ringing' NOT NULL,
	"from_number" text,
	"to_number" text,
	"campaign" text,
	"metrics" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_telephony_credentials" ADD CONSTRAINT "tenant_telephony_credentials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_telephony_credentials" ADD CONSTRAINT "tenant_telephony_credentials_created_by_tenant_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."tenant_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_dnc" ADD CONSTRAINT "voice_dnc_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_outbound_attempts" ADD CONSTRAINT "voice_outbound_attempts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_campaign_outcomes" ADD CONSTRAINT "voice_campaign_outcomes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_campaign_reports" ADD CONSTRAINT "voice_campaign_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_users_email_key" ON "tenant_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "tenant_users_tenant_status_idx" ON "tenant_users" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "tenant_telephony_credentials_tenant_idx" ON "tenant_telephony_credentials" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_telephony_credentials_active_provider_key" ON "tenant_telephony_credentials" USING btree ("tenant_id","provider") WHERE "tenant_telephony_credentials"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_login_failures_scope_identifier_key" ON "auth_login_failures" USING btree ("scope_type","identifier_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "voice_dnc_tenant_phone_key" ON "voice_dnc" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX "voice_outbound_tenant_phone_campaign_idx" ON "voice_outbound_attempts" USING btree ("tenant_id","phone","campaign");--> statement-breakpoint
CREATE INDEX "voice_outbound_tenant_status_idx" ON "voice_outbound_attempts" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "voice_outbound_tenant_livehub_campaign_idx" ON "voice_outbound_attempts" USING btree ("tenant_id","live_hub_campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "voice_campaign_outcomes_target_uidx" ON "voice_campaign_outcomes" USING btree ("live_hub_campaign_id","target_id");--> statement-breakpoint
CREATE INDEX "voice_campaign_outcomes_tenant_campaign_idx" ON "voice_campaign_outcomes" USING btree ("tenant_id","live_hub_campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "voice_calls_call_id_uidx" ON "voice_calls" USING btree ("call_id");--> statement-breakpoint
CREATE INDEX "voice_calls_tenant_provider_call_idx" ON "voice_calls" USING btree ("tenant_id","provider_call_id");