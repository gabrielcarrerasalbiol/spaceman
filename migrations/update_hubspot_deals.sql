-- Fix HubSpotDeal schema for import tracking

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS "hubspot_deals_clientid_idx";
DROP INDEX IF EXISTS "hubspot_deals_contractid_idx";

-- Drop existing foreign key constraints if they exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'hubspot_deals_clientid_fkey'
    ) THEN
        ALTER TABLE "hubspot_deals" DROP CONSTRAINT "hubspot_deals_clientid_fkey";
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'hubspot_deals_contractid_fkey'
    ) THEN
        ALTER TABLE "hubspot_deals" DROP CONSTRAINT "hubspot_deals_contractid_fkey";
    END IF;
END $$;

-- Add columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hubspot_deals' AND column_name = 'clientid'
    ) THEN
        ALTER TABLE "hubspot_deals" ADD COLUMN "clientid" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hubspot_deals' AND column_name = 'contractid'
    ) THEN
        ALTER TABLE "hubspot_deals" ADD COLUMN "contractid" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hubspot_deals' AND column_name = 'importedat'
    ) THEN
        ALTER TABLE "hubspot_deals" ADD COLUMN "importedat" TIMESTAMP(3);
    END IF;
END $$;

-- Add foreign key constraints (many-to-one, nullable)
ALTER TABLE "hubspot_deals" ADD CONSTRAINT "hubspot_deals_clientid_fkey"
    FOREIGN KEY ("clientid") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "hubspot_deals" ADD CONSTRAINT "hubspot_deals_contractid_fkey"
    FOREIGN KEY ("contractid") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "hubspot_deals_clientid_idx" ON "hubspot_deals"("clientid");
CREATE INDEX IF NOT EXISTS "hubspot_deals_contractid_idx" ON "hubspot_deals"("contractid");

-- Verify the changes
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'hubspot_deals'
AND column_name IN ('clientid', 'contractid', 'importedat')
ORDER BY column_name;
