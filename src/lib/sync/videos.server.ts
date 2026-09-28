import { supabaseAdmin } from '@/integrations/supabase/client.server'

const normalize = (s: string) => s.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
// Sources may publish a JSON catalogue at their configured URL. Never scrape arbitrary HTML or infer playable URLs.
// Expected format: { anime: [{ slug, title, cover_url, synopsis, status, episodes: [{ number, title, sources: [{ label, kind, url }] }] }] }
export async function runVideoSync(trigger: string) {
  const { data: run, error: lockError } = await supabaseAdmin.from('sync_runs').insert({ trigger, status: 'running' }).select('id').single()
  if (lockError || !run) return { status: 'locked', error: lockError?.message }
  const stats = { sources: 0, anime: 0, episodes: 0 }
  const errors: string[] = []
  try {
    const { data: sources, error } = await supabaseAdmin.from('video_sources_catalog').select('*').eq('enabled', true)
    if (error) throw error
    for (const source of sources ?? []) {
      stats.sources++
      try {
        const response = await fetch(source.base_url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const feed = await response.json() as { anime?: { slug: string; title: string; cover_url?: string; synopsis?: string; status?: string; episodes?: { number: number; title?: string; sources?: { label: string; kind: string; url: string }[] }[] }[] }
        if (!Array.isArray(feed.anime)) throw new Error('Formato de catálogo no compatible')
        for (const anime of feed.anime.slice(0, 100)) {
          if (!anime.slug || !anime.title) continue
          const { data: originals } = await supabaseAdmin.from('animes').select('id,search_keys').contains('search_keys', [normalize(anime.title)]).limit(1)
          const { data: video, error: videoError } = await supabaseAdmin.from('video_animes').upsert({ anime_id: originals?.[0]?.id ?? null, title: anime.title, cover_url: anime.cover_url ?? null, synopsis: anime.synopsis ?? null, status: anime.status === 'finished' ? 'finished' : 'airing', external_slug: anime.slug, source_name: source.name, episodes_total: anime.episodes?.length ?? null, last_synced_at: new Date().toISOString(), last_sync_error: null }, { onConflict: 'source_name,external_slug' }).select('id').single()
          if (videoError || !video) throw videoError ?? new Error('No se pudo guardar anime')
          stats.anime++
          for (const episode of anime.episodes ?? []) {
            if (!Number.isFinite(episode.number)) continue
            const { data: existing } = await supabaseAdmin.from('video_episodes').select('id').eq('video_anime_id', video.id).eq('number', episode.number).maybeSingle()
            const { data: saved, error: episodeError } = await supabaseAdmin.from('video_episodes').upsert({ video_anime_id: video.id, number: episode.number, title: episode.title ?? null }, { onConflict: 'video_anime_id,number' }).select('id').single()
            if (episodeError || !saved) throw episodeError ?? new Error('No se pudo guardar episodio')
            if (!existing) { stats.episodes++; await supabaseAdmin.from('video_changes').insert({ video_anime_id: video.id, kind: 'episode_added', new_value: { number: episode.number }, source_name: source.name }) }
            for (const server of episode.sources ?? []) {
              try {
                const url = new URL(server.url)
                if (url.protocol !== 'https:' || !['iframe','youtube','external'].includes(server.kind)) continue
                await supabaseAdmin.from('video_sources').upsert({ episode_id: saved.id, label: server.label, kind: server.kind as 'iframe'|'youtube'|'external', url: url.toString() }, { onConflict: 'episode_id,url' })
              } catch { /* ignore malformed links */ }
            }
          }
        }
        await supabaseAdmin.from('video_sources_catalog').update({ last_checked_at: new Date().toISOString(), last_error: null }).eq('id', source.id)
      } catch (error) {
        errors.push(`${source.name}: ${String(error)}`)
        await supabaseAdmin.from('video_sources_catalog').update({ last_checked_at: new Date().toISOString(), last_error: String(error) }).eq('id', source.id)
        await supabaseAdmin.from('video_animes').update({ last_sync_error: String(error) }).eq('source_name', source.name)
      }
      await new Promise(resolve => setTimeout(resolve, 1200))
    }
  } catch (error) { errors.push(String(error)) }
  await supabaseAdmin.from('sync_runs').update({ status: errors.length ? 'error' : 'success', stats, errors, finished_at: new Date().toISOString() }).eq('id', run.id)
  return { status: errors.length ? 'error' : 'success', stats, errors }
}
