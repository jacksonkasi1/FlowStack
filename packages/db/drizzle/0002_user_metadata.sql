-- Migration: Replace organizationName with metadata JSONB field
-- This migration drops the dedicated organizationName column and adds a flexible metadata field

ALTER TABLE "user" ADD COLUMN "metadata" jsonb;
ALTER TABLE "user" DROP COLUMN IF EXISTS "organizationName";
