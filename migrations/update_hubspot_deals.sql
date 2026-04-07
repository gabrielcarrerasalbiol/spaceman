-- Add client and contract import fields to hubspot_deals table
ALTER TABLE "hubspot_deals" ADD COLUMN "clientid" TEXT;
ALTER TABLE "hubspot_deals" ADD COLUMN "contractid" TEXT;
ALTER TABLE "hubspot_deals" ADD COLUMN "importedat" TIMESTAMP(3);

-- Add foreign key constraints
ALTER TABLE "hubspot_deals" ADD CONSTRAINT "hubspot_deals_clientid_fkey" FOREIGN KEY ("clientid") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hubspot_deals" ADD CONSTRAINT "hubspot_deals_contractid_fkey" FOREIGN KEY ("contractid") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS "hubspot_deals_clientid_idx" ON "hubspot_deals"("clientid");
CREATE INDEX IF NOT EXISTS "hubspot_deals_contractid_idx" ON "hubspot_deals"("contractid");

-- Add inverse relation to clients table (this may need to be done differently depending on your setup)
-- The Prisma client will handle the relation on the application side
