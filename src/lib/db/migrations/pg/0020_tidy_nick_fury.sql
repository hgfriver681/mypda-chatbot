CREATE TABLE "model_catalog_config" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"config" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
