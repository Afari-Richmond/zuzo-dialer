CREATE TYPE "public"."tenant_user_token_purpose" AS ENUM('invite', 'password_reset');--> statement-breakpoint
CREATE TABLE "tenant_user_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" "tenant_user_token_purpose" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_user_tokens" ADD CONSTRAINT "tenant_user_tokens_tenant_user_id_tenant_users_id_fk" FOREIGN KEY ("tenant_user_id") REFERENCES "public"."tenant_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenant_user_tokens_hash_idx" ON "tenant_user_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "tenant_user_tokens_user_idx" ON "tenant_user_tokens" USING btree ("tenant_user_id");