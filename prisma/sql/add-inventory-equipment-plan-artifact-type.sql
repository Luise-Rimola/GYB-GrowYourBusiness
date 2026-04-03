-- Adds enum value for Prisma model Artifact.type (ArtifactType).
-- Use if `npx prisma db push` fails (e.g. Supabase pooler "max clients reached").
-- Run in Supabase: SQL Editor → New query → paste → Run.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ArtifactType'
      AND e.enumlabel = 'inventory_equipment_plan'
  ) THEN
    ALTER TYPE "ArtifactType" ADD VALUE 'inventory_equipment_plan';
  END IF;
END
$$;
