ALTER TABLE "invitation" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "organizationName";