-- Adds additional ArtifactType enum values for workflow coverage expansion.
-- Run manually if prisma db push cannot alter enum in managed Postgres.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ArtifactType' AND e.enumlabel = 'data_strategy'
  ) THEN
    ALTER TYPE "ArtifactType" ADD VALUE 'data_strategy';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ArtifactType' AND e.enumlabel = 'customer_experience_cx'
  ) THEN
    ALTER TYPE "ArtifactType" ADD VALUE 'customer_experience_cx';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ArtifactType' AND e.enumlabel = 'organization_roles'
  ) THEN
    ALTER TYPE "ArtifactType" ADD VALUE 'organization_roles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ArtifactType' AND e.enumlabel = 'hiring_talent_strategy'
  ) THEN
    ALTER TYPE "ArtifactType" ADD VALUE 'hiring_talent_strategy';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ArtifactType' AND e.enumlabel = 'conversion_funnel_analysis'
  ) THEN
    ALTER TYPE "ArtifactType" ADD VALUE 'conversion_funnel_analysis';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ArtifactType' AND e.enumlabel = 'social_media_content_plan'
  ) THEN
    ALTER TYPE "ArtifactType" ADD VALUE 'social_media_content_plan';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ArtifactType' AND e.enumlabel = 'customer_economics_ltv_cac'
  ) THEN
    ALTER TYPE "ArtifactType" ADD VALUE 'customer_economics_ltv_cac';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ArtifactType' AND e.enumlabel = 'pmf_assessment'
  ) THEN
    ALTER TYPE "ArtifactType" ADD VALUE 'pmf_assessment';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ArtifactType' AND e.enumlabel = 'growth_loops'
  ) THEN
    ALTER TYPE "ArtifactType" ADD VALUE 'growth_loops';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ArtifactType' AND e.enumlabel = 'business_model_mechanics'
  ) THEN
    ALTER TYPE "ArtifactType" ADD VALUE 'business_model_mechanics';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ArtifactType' AND e.enumlabel = 'capital_strategy'
  ) THEN
    ALTER TYPE "ArtifactType" ADD VALUE 'capital_strategy';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ArtifactType' AND e.enumlabel = 'barriers_to_entry'
  ) THEN
    ALTER TYPE "ArtifactType" ADD VALUE 'barriers_to_entry';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ArtifactType' AND e.enumlabel = 'moat_assessment'
  ) THEN
    ALTER TYPE "ArtifactType" ADD VALUE 'moat_assessment';
  END IF;
END
$$;
