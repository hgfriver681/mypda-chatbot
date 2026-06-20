CREATE TABLE "skill_bundle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"member_skill_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lock" jsonb,
	"user_id" uuid NOT NULL,
	"visibility" varchar DEFAULT 'private' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"version" text DEFAULT '0.0.1' NOT NULL,
	"category" text,
	"manifest" jsonb,
	"storage_key" text,
	"content_hash" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"user_id" uuid NOT NULL,
	"visibility" varchar DEFAULT 'private' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "skill_user_name_uq" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "skill_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_id" uuid NOT NULL,
	"version" text NOT NULL,
	"storage_key" text,
	"content_hash" text,
	"changelog" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "skill_version_skill_version_uq" UNIQUE("skill_id","version")
);
--> statement-breakpoint
ALTER TABLE "skill_bundle" ADD CONSTRAINT "skill_bundle_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill" ADD CONSTRAINT "skill_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_version" ADD CONSTRAINT "skill_version_skill_id_skill_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skill_bundle_user_id_idx" ON "skill_bundle" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "skill_user_id_idx" ON "skill" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "skill_version_skill_id_idx" ON "skill_version" USING btree ("skill_id");