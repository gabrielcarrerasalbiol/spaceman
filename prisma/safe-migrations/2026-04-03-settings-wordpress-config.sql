-- Add persistent WordPress integration credentials/settings to the settings singleton.
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS "wordpressConfig" JSONB NOT NULL DEFAULT '{}'::jsonb;
