-- Add unit detail columns to hubspot_deals table

-- Add columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hubspot_deals' AND column_name = 'unitnumber'
    ) THEN
        ALTER TABLE "hubspot_deals" ADD COLUMN "unitnumber" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hubspot_deals' AND column_name = 'unittype'
    ) THEN
        ALTER TABLE "hubspot_deals" ADD COLUMN "unittype" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hubspot_deals' AND column_name = 'unitsize'
    ) THEN
        ALTER TABLE "hubspot_deals" ADD COLUMN "unitsize" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hubspot_deals' AND column_name = 'locationname'
    ) THEN
        ALTER TABLE "hubspot_deals" ADD COLUMN "locationname" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hubspot_deals' AND column_name = 'startdate'
    ) THEN
        ALTER TABLE "hubspot_deals" ADD COLUMN "startdate" TIMESTAMP(3);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hubspot_deals' AND column_name = 'enddate'
    ) THEN
        ALTER TABLE "hubspot_deals" ADD COLUMN "enddate" TIMESTAMP(3);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hubspot_deals' AND column_name = 'weeklyrate'
    ) THEN
        ALTER TABLE "hubspot_deals" ADD COLUMN "weeklyrate" NUMERIC(10,2);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hubspot_deals' AND column_name = 'monthlyrate'
    ) THEN
        ALTER TABLE "hubspot_deals" ADD COLUMN "monthlyrate" NUMERIC(10,2);
    END IF;
END $$;

-- Verify the changes
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'hubspot_deals'
AND column_name IN ('unitnumber', 'unittype', 'unitsize', 'locationname', 'startdate', 'enddate', 'weeklyrate', 'monthlyrate')
ORDER BY column_name;
