CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"key_hash" text NOT NULL,
	"prefix" text NOT NULL,
	"name" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"last_used_at" timestamp,
	"revoked_at" timestamp,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "invocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"tool" text NOT NULL,
	"query" text,
	"retrieved" jsonb,
	"latency_ms" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"structured" jsonb,
	"kind" text DEFAULT 'text' NOT NULL,
	"summary" text,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"source" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_account_id_user_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invocations" ADD CONSTRAINT "invocations_account_id_user_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_account_id_user_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_account_idx" ON "api_keys" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "invocations_account_idx" ON "invocations" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "memories_account_idx" ON "memories" USING btree ("account_id","created_at");