import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/integrations/supabase/types'
import { adapters } from './adapters.server'
import { detectVideoType, type DiscoveredEpisode, type Lang, type RawItem, type ScanResult, type SourceConfig, type SourceProvider } from './types'

type Db = SupabaseClient<Database>
type ProviderRow = Database['public']['Tables']['source_providers']['Row']
const MAX_PER_PROVIDER = 500
const MIN_GAP_MS = 60_000

export function rowToProvider(r: ProviderRow): SourceProvider {
  return { id: r.id, name: r.name, baseUrl: r.base_url, type: r.type as SourceProvider['type'], config: (r.config ?? {}) as SourceConfig, enabled: r.enabled, scanIntervalMinutes: r.scan_interval_minutes, lastScanAt: r.last_scan_at, lastScanStatus: r.last_scan_status as SourceProvider['lastScanStatus'], lastScanMessage: r.last_scan_message, lastScanFound: r.last_scan_found, lastScanNew: r.last_scan_new }
}

const slug = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const normKey = (s: string) => s.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const SUFFIXES = /\b(sub(titulado)?\s*espa[nñ]ol|sub|online|hd|full\s*hd|1080p|720p|gratis|latino|castellano|audio\s*latino|doblado|ver)\b/gi

async function hashId(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('')
}

type Catalog = { videos: { id: string; key: string }[]; animes: { id: string; keys: string[] }[] }
async function loadCatalog(db: Db): Promise<Catalog> {
  const [v, a] = await Promise.all([db.from('video_animes').select('id,title'), db.from('animes').select('id,search_keys').limit(2000)])
  return { videos: (v.data ?? []).map(x => ({ id: x.id, key: normKey(x.title) })), animes: (a.data ?? []).map(x => ({ id: x.id, keys: x.search_keys ?? [] })) }
}

export async function normalize(item: RawItem, p: SourceProvider, single: boolean, catalog: Catalog): Promise<DiscoveredEpisode | null> {
  try {
    if (!item.url || !item.title) return null
    const url = new URL(item.url)
    if (url.protocol !== 'https:') return null
    const inc = p.config.includePattern ? new RegExp(p.config.includePattern, 'i') : null
    const exc = p.config.excludePattern ? new RegExp(p.config.excludePattern, 'i') : null
    if (inc && !inc.test(item.url)) return null
    if (exc && exc.test(item.url)) return null
    let episode: number | null = null
    let epMatch: RegExpMatchArray | null = null
    if (p.config.episodeRegex) { epMatch = item.title.match(new RegExp(p.config.episodeRegex, 'i')) ?? item.url.match(new RegExp(p.config.episodeRegex, 'i')); if (epMatch?.[1]) episode = Number(epMatch[1]) }
    if (episode == null) { epMatch = item.title.match(/(?:episodio|cap[ií]tulo|ep)[-\s.]?(\d+)/i) ?? url.pathname.match(/ep[-\s]?(\d+)/i) ?? url.pathname.replace(/\/$/, '').match(/(\d+)$/); if (epMatch?.[1]) episode = Number(epMatch[1]) }
    if (episode == null) { if (!single) return null; episode = 1 }
    if (!Number.isFinite(episode) || episode < 0 || episode > 5000) return null
    let title = item.title
    if (epMatch && item.title.includes(epMatch[0])) title = title.replace(epMatch[0], ' ')
    title = title.replace(/(?:episodio|cap[ií]tulo|ep)\s*\d+/gi, ' ').replace(SUFFIXES, ' ').replace(/[\-–|:·]+\s*$/g, '').replace(/\s+/g, ' ').trim()
    if (!title) return null
    const lang: Lang = /\b(dub|doblad[oa]|latino|castellano)\b/i.test(item.title) ? 'dub' : p.config.langDefault ?? 'sub'
    const key = normKey(title)
    const video = catalog.videos.find(v => v.key === key) ?? catalog.videos.find(v => v.key.length > 3 && (v.key.includes(key) || key.includes(v.key)))
    const anime = catalog.animes.find(a => a.keys.includes(key))
    const animeId = video?.id ?? anime?.id ?? slug(title)
    return { id: await hashId(`${p.id}|${animeId}|${episode}|${lang}`), providerId: p.id, animeId, videoAnimeId: video?.id ?? null, animeTitle: title, episode, type: detectVideoType(url.toString()), url: url.toString(), lang, detectedAt: new Date().toISOString(), isNew: true }
  } catch (e) {
    console.warn('[sources] normalize failed', item.url, e)
    return null
  }
}

export async function scanOnly(p: SourceProvider, db: Db) {
  const raw = await adapters[p.type].scan(p)
  const catalog = await loadCatalog(db)
  const items: DiscoveredEpisode[] = []
  for (const r of raw.slice(0, 1000)) { const n = await normalize(r, p, raw.length === 1, catalog); if (n) items.push(n) }
  const unique = [...new Map(items.map(i => [i.id, i])).values()]
  return { raw: raw.length, items: unique }
}

export async function testProvider(p: SourceProvider, db: Db): Promise<ScanResult> {
  try {
    const { raw, items } = await scanOnly(p, db)
    return { found: raw, new: items.length, updated: 0, errors: [], preview: items.slice(0, 10).map(i => ({ title: i.animeTitle, episode: i.episode, type: i.type, lang: i.lang, url: i.url })) }
  } catch (e) { return { found: 0, new: 0, updated: 0, errors: [e instanceof Error ? e.message : String(e)] } }
}

export async function syncProvider(p: SourceProvider, db: Db, force = false): Promise<ScanResult> {
  if (!force && p.lastScanAt && Date.now() - new Date(p.lastScanAt).getTime() < MIN_GAP_MS) return { found: 0, new: 0, updated: 0, errors: ['Espera al menos 60 s entre escaneos de la misma fuente'] }
  if (p.lastScanStatus === 'running' && p.lastScanAt && Date.now() - new Date(p.lastScanAt).getTime() < 10 * 60_000) return { found: 0, new: 0, updated: 0, errors: ['Ya hay un escaneo en curso'] }
  await db.from('source_providers').update({ last_scan_status: 'running', last_scan_at: new Date().toISOString() }).eq('id', p.id)
  const result: ScanResult = { found: 0, new: 0, updated: 0, errors: [] }
  try {
    const { raw, items } = await scanOnly(p, db)
    result.found = raw
    // Los episodios nuevos del escaneo anterior dejan de ser nuevos tras un escaneo.
    await db.from('discovered_episodes').update({ is_new: false }).eq('provider_id', p.id).eq('is_new', true)
    const { data: existing } = await db.from('discovered_episodes').select('id,url').eq('provider_id', p.id)
    const map = new Map((existing ?? []).map(e => [e.id, e.url]))
    const inserts = items.filter(i => !map.has(i.id))
    const updates = items.filter(i => map.has(i.id) && map.get(i.id) !== i.url)
    if (inserts.length) {
      const { error } = await db.from('discovered_episodes').insert(inserts.map(i => ({ id: i.id, provider_id: p.id, anime_id: i.animeId, video_anime_id: i.videoAnimeId, anime_title: i.animeTitle, episode: i.episode, type: i.type, url: i.url, lang: i.lang, is_new: true })))
      if (error) throw error
    }
    for (const u of updates) await db.from('discovered_episodes').update({ url: u.url, type: u.type }).eq('id', u.id)
    result.new = inserts.length
    result.updated = updates.length
    const { data: all } = await db.from('discovered_episodes').select('id').eq('provider_id', p.id).order('detected_at', { ascending: false })
    const overflow = (all ?? []).slice(MAX_PER_PROVIDER).map(r => r.id)
    if (overflow.length) await db.from('discovered_episodes').delete().in('id', overflow)
    await db.from('source_providers').update({ last_scan_status: 'ok', last_scan_at: new Date().toISOString(), last_scan_message: `${raw} elementos, ${items.length} válidos`, last_scan_found: raw, last_scan_new: inserts.length }).eq('id', p.id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    result.errors.push(msg)
    await db.from('source_providers').update({ last_scan_status: 'error', last_scan_at: new Date().toISOString(), last_scan_message: msg, last_scan_found: 0, last_scan_new: 0 }).eq('id', p.id)
  }
  return result
}

export async function syncAll(db: Db, opts: { onlyDue?: boolean } = {}) {
  const [{ data: rows }, { data: setting }] = await Promise.all([
    db.from('source_providers').select('*').eq('enabled', true),
    db.from('app_settings').select('value').eq('key', 'scan_interval_minutes').maybeSingle(),
  ])
  const globalInterval = Number((setting?.value as Json) ?? 60) || 60
  const providers = (rows ?? []).map(rowToProvider).filter(p => {
    if (!opts.onlyDue || !p.lastScanAt) return true
    return Date.now() - new Date(p.lastScanAt).getTime() >= (p.scanIntervalMinutes ?? globalInterval) * 60_000
  })
  const settled = await Promise.allSettled(providers.map((p, i) => new Promise<ScanResult>(resolve => setTimeout(() => resolve(syncProvider(p, db)), i * 2000))))
  return providers.map((p, i) => {
    const s = settled[i]
    return { id: p.id, name: p.name, ...(s.status === 'fulfilled' ? s.value : { found: 0, new: 0, updated: 0, errors: [String(s.reason)] }) }
  })
}
