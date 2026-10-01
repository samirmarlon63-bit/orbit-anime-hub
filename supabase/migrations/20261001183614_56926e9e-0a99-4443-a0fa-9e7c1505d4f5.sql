ALTER TABLE public.source_providers DROP CONSTRAINT IF EXISTS source_providers_type_check;
ALTER TABLE public.source_providers ADD CONSTRAINT source_providers_type_check CHECK (type IN ('auto','rss','json','sitemap','html'));
ALTER TABLE public.source_providers ALTER COLUMN type SET DEFAULT 'auto';
ALTER TABLE public.source_providers ADD COLUMN IF NOT EXISTS last_scan_contents integer NOT NULL DEFAULT 0;
ALTER TABLE public.source_providers ADD COLUMN IF NOT EXISTS last_scan_chapters integer NOT NULL DEFAULT 0;
ALTER TABLE public.source_providers ADD COLUMN IF NOT EXISTS last_scan_errors jsonb NOT NULL DEFAULT '[]'::jsonb;
UPDATE public.app_settings SET value = '300'::jsonb, updated_at = now() WHERE key = 'scan_interval_minutes';