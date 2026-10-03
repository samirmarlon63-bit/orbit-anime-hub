ALTER TABLE public.video_sources ADD COLUMN IF NOT EXISTS page_url text;
UPDATE public.video_sources SET page_url = url WHERE kind = 'external' AND page_url IS NULL;
UPDATE public.video_sources s SET page_url = (
  SELECT regexp_replace(s2.url, 'episodio-\d+', 'episodio-' || trunc(e.number)::int::text)
  FROM public.video_sources s2 JOIN public.video_episodes e2 ON e2.id = s2.episode_id
  WHERE e2.video_anime_id = e.video_anime_id AND s2.url ~ 'episodio-\d+' LIMIT 1)
FROM public.video_episodes e
WHERE e.id = s.episode_id AND s.page_url IS NULL;
DELETE FROM public.video_sources WHERE url ~ '/lanzamiento/\d{4}/?$';
DELETE FROM public.video_episodes e WHERE e.number >= 1900 AND NOT EXISTS (SELECT 1 FROM public.video_sources s WHERE s.episode_id = e.id);