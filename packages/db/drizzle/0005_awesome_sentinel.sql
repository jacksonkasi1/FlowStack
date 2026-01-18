ALTER TABLE "user" ADD COLUMN "should_onboard" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "current_onboarding_step" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "completed_onboarding_steps" text;