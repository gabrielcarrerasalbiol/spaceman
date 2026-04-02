-- Non-destructive patch for production databases that are missing newer schema pieces.
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS "settings" (
  "id" TEXT PRIMARY KEY,
  "siteName" TEXT NOT NULL DEFAULT 'Skeleton',
  "siteLogo" TEXT,
  "siteDescription" TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#3b82f6',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "settings"
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

UPDATE "settings"
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE "updatedAt" IS NULL;

CREATE OR REPLACE FUNCTION set_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_settings_updated_at ON "settings";

CREATE TRIGGER trg_settings_updated_at
BEFORE UPDATE ON "settings"
FOR EACH ROW
EXECUTE FUNCTION set_settings_updated_at();

ALTER TABLE "settings"
ADD COLUMN IF NOT EXISTS "unitStatusConfig" JSONB NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO "settings" ("id", "siteName", "primaryColor")
VALUES ('default', 'Skeleton', '#3b82f6')
ON CONFLICT ("id") DO NOTHING;
