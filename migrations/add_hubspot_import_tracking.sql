-- Add explicit import tracking flag for HubSpot deals.
ALTER TABLE "hubspot_deals"
ADD COLUMN IF NOT EXISTS "isimported" BOOLEAN NOT NULL DEFAULT false;

-- Backfill flag from existing imported timestamp data.
UPDATE "hubspot_deals"
SET "isimported" = true
WHERE "importedat" IS NOT NULL;
