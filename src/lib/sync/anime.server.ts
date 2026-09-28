import { supabaseAdmin } from '@/integrations/supabase/client.server'

type AniNode = { id: number; idMal: number | null; title: { romaji: string; english: string | null; native: string | null }; synonyms: string[]; coverImage: { extraLarge: string | null }; description: string | null; genres: string[]; studios: { nodes: { name: string }[] }; season: string | null; seasonYear: number | null; startDate: { year: number | null; month: number | null; day: number | null }; nextAiringEpisode: { airingAt: number; episode: number } | null; status: string; popularity: number; siteUrl: string }
const normalize = (s: string) => s.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
export async function runAnimeSync(trigger: string) {
  const { data: run, error: lockError } = await supabaseAdmin.from('sync_runs').insert({ trigger, status: 'running' }).select('id').single()
  if (lockError || !run) return { status: 'locked', error: lockError?.message }
  const stats = { processed: 0, added: 0, changed: 0, conflicts: 0 }
  const errors: string[] = []
  try {
    for (let page = 1; page <= 3; page++) {
      const response = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `query($page:Int){Page(page:$page,perPage:25){media(type:ANIME,sort:START_DATE,seasonYear:2026){id idMal title{romaji english native} synonyms coverImage{extraLarge} description(asHtml:false) genres studios(isMain:true){nodes{name}} season seasonYear startDate{year month day} nextAiringEpisode{airingAt episode} status popularity siteUrl}}}`, variables: { page } }) })
      if (!response.ok) throw new Error(`AniList HTTP ${response.status}`)
      const payload = await response.json() as { data?: { Page?: { media?: AniNode[] } }; errors?: { message: string }[] }
      if (payload.errors?.length) throw new Error(payload.errors[0]?.message ?? 'AniList error')
      for (const item of payload.data?.Page?.media ?? []) {
        stats.processed++
        const { data: existing } = await supabaseAdmin.from('animes').select('id,release_at,date_confirmed').eq('anilist_id', item.id).maybeSingle()
        const { year, month, day } = item.startDate
        const date = year && month && day ? new Date(Date.UTC(year, month - 1, day)).toISOString() : null
        const exact = item.nextAiringEpisode ? new Date(item.nextAiringEpisode.airingAt * 1000).toISOString() : null
        const nextDate = exact ?? date
        if (existing?.date_confirmed && existing.release_at && nextDate && existing.release_at !== nextDate && !exact) {
          stats.conflicts++
          await supabaseAdmin.from('anime_changes').insert({ anime_id: existing.id, field: 'release_at', old_value: existing.release_at, new_value: nextDate, source_name: 'AniList', conflict: true })
        }
        const release = existing?.date_confirmed && !exact ? existing.release_at : nextDate
        if (existing && existing.release_at !== release && release) {
          stats.changed++
          await supabaseAdmin.from('anime_changes').insert({ anime_id: existing.id, field: 'release_at', old_value: existing.release_at, new_value: release, source_name: 'AniList' })
        }
        const keys = [...new Set([item.title.romaji, item.title.english, item.title.native, ...item.synonyms].filter((v): v is string => Boolean(v)).map(normalize))]
        const record = { anilist_id: item.id, mal_id: item.idMal, title_romaji: item.title.romaji, title_english: item.title.english, title_native: item.title.native, synonyms: item.synonyms, search_keys: keys, cover_url: item.coverImage.extraLarge, synopsis: item.description?.replace(/<[^>]*>/g, '') ?? null, genres: item.genres, studio: item.studios.nodes[0]?.name ?? null, season: item.season && item.seasonYear ? `${item.season} ${item.seasonYear}` : null, release_at: release, date_confirmed: Boolean(exact) || Boolean(existing?.date_confirmed), airing_at: exact, status: item.status, popularity: item.popularity, source_name: 'AniList', source_url: item.siteUrl, data_sources: { title: 'AniList', release_at: exact ? 'AniList schedule' : 'AniList' }, last_checked_at: new Date().toISOString() }
        const { data: saved, error } = await supabaseAdmin.from('animes').upsert(record, { onConflict: 'anilist_id' }).select('id').single()
        if (error) { errors.push(error.message); continue }
        if (!existing && saved) {
          stats.added++
          await supabaseAdmin.from('discoveries').insert({ anime_id: saved.id, title: item.title.romaji, source_name: 'AniList', source_url: item.siteUrl })
        }
      }
      await new Promise(resolve => setTimeout(resolve, 900))
    }
    // Jikan supplies an independent cross-check without replacing confirmed AniList data.
    const jikan = await fetch('https://api.jikan.moe/v4/seasons/now?limit=5')
    if (jikan.ok) {
      const data = await jikan.json() as { data?: { mal_id: number; title: string; aired?: { from?: string } }[] }
      for (const item of data.data ?? []) {
        const { data: match } = await supabaseAdmin.from('animes').select('id,release_at,date_confirmed').eq('mal_id', item.mal_id).maybeSingle()
        if (match && item.aired?.from && match.release_at && new Date(item.aired.from).toISOString().slice(0,10) !== match.release_at.slice(0,10)) {
          stats.conflicts++
          await supabaseAdmin.from('anime_changes').insert({ anime_id: match.id, field: 'release_at', old_value: match.release_at, new_value: item.aired.from, source_name: 'Jikan', conflict: true })
        }
      }
    } else errors.push(`Jikan HTTP ${jikan.status}`)
  } catch (error) { errors.push(String(error)) }
  await supabaseAdmin.from('sync_runs').update({ status: errors.length ? 'error' : 'success', stats, errors, finished_at: new Date().toISOString() }).eq('id', run.id)
  return { status: errors.length ? 'error' : 'success', stats, errors }
}
