-- 0002 and 0003 already applied these changes. Keep the historical migration
-- safe for a fresh database as well as databases created before those files.
ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "organizationName";
