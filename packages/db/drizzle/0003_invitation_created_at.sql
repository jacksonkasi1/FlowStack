-- Migration: Add missing createdAt field to invitation table
-- Required by better-auth organization plugin

ALTER TABLE "invitation" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;
