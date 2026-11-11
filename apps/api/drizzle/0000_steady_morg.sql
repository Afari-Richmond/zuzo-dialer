CREATE TYPE "public"."auth_login_scope" AS ENUM('platform', 'tenant');--> statement-breakpoint
CREATE TYPE "public"."platform_admin_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."telephony_provider" AS ENUM('livehub', 'twilio', 'africastalking', 'stub');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('trial', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."tenant_user_role" AS ENUM('tenant_admin', 'agent');--> statement-breakpoint
CREATE TYPE "public"."tenant_user_status" AS ENUM('invited', 'active', 'suspended');--> statement-breakpoint
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
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_telephony_credentials" ADD CONSTRAINT "tenant_telephony_credentials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_telephony_credentials" ADD CONSTRAINT "tenant_telephony_credentials_created_by_tenant_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."tenant_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_users_email_key" ON "tenant_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "tenant_users_tenant_status_idx" ON "tenant_users" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "tenant_telephony_credentials_tenant_idx" ON "tenant_telephony_credentials" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_telephony_credentials_active_provider_key" ON "tenant_telephony_credentials" USING btree ("tenant_id","provider") WHERE "tenant_telephony_credentials"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_login_failures_scope_identifier_key" ON "auth_login_failures" USING btree ("scope_type","identifier_hash");