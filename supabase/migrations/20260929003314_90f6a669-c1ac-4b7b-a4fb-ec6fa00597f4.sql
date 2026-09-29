CREATE TABLE public.source_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_url text NOT NULL,
  type text NOT NULL CHECK (type IN ('rss','json','sitemap','html')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  scan_interval_minutes integer CHECK (scan_interval_minutes IS NULL OR scan_interval_minutes >= 5),
  last_scan_at timestamptz,
  last_scan_status text CHECK (last_scan_status IN ('ok','error','running')),
  last_scan_message text,
  last_scan_found integer NOT NULL DEFAULT 0,
  last_scan_new integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.source_providers TO authenticated;
GRANT ALL ON public.source_providers TO service_role;
ALTER TABLE public.source_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage providers" ON public.source_providers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER source_providers_updated BEFORE UPDATE ON public.source_providers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.discovered_episodes (
  id text PRIMARY KEY,
  provider_id uuid NOT NULL REFERENCES public.source_providers(id) ON DELETE CASCADE,
  anime_id text NOT NULL,
  video_anime_id uuid REFERENCES public.video_animes(id) ON DELETE SET NULL,
  anime_title text NOT NULL,
  episode integer NOT NULL,
  type text NOT NULL CHECK (type IN ('youtube','hls','mp4','embed')),
  url text NOT NULL,
  lang text NOT NULL CHECK (lang IN ('sub','dub','neutro')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  is_new boolean NOT NULL DEFAULT true
);
CREATE INDEX discovered_provider_idx ON public.discovered_episodes(provider_id);
CREATE INDEX discovered_anime_ep_idx ON public.discovered_episodes(anime_id, episode, lang);
CREATE INDEX discovered_video_idx ON public.discovered_episodes(video_anime_id);
GRANT SELECT ON public.discovered_episodes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discovered_episodes TO authenticated;
GRANT ALL ON public.discovered_episodes TO service_role;
ALTER TABLE public.discovered_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read discovered episodes" ON public.discovered_episodes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins write discovered" ON public.discovered_episodes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update discovered" ON public.discovered_episodes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete discovered" ON public.discovered_episodes FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage settings" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.app_settings(key,value) VALUES ('scan_interval_minutes','60'::jsonb);