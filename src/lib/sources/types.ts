export type SourceType = 'rss' | 'json' | 'sitemap' | 'html'
export type ScanStatus = 'ok' | 'error' | 'running' | null
export type VideoType = 'youtube' | 'hls' | 'mp4' | 'embed'
export type Lang = 'sub' | 'dub' | 'neutro'

export type SourceConfig = {
  episodeRegex?: string
  langDefault?: Lang
  itemsPath?: string
  titleField?: string
  urlField?: string
  urlPattern?: string
  itemSelector?: string
  titleSelector?: string
  linkSelector?: string
  dateSelector?: string
  includePattern?: string
  excludePattern?: string
}

export type SourceProvider = {
  id: string
  name: string
  baseUrl: string
  type: SourceType
  config: SourceConfig
  enabled: boolean
  scanIntervalMinutes: number | null
  lastScanAt: string | null
  lastScanStatus: ScanStatus
  lastScanMessage: string | null
  lastScanFound: number
  lastScanNew: number
}

export type RawItem = { title: string; url: string; date?: string | null }

export type DiscoveredEpisode = {
  id: string
  providerId: string
  animeId: string
  videoAnimeId: string | null
  animeTitle: string
  episode: number
  type: VideoType
  url: string
  lang: Lang
  detectedAt: string
  isNew: boolean
}

export type ScanResult = { found: number; new: number; updated: number; errors: string[]; preview?: { title: string; episode: number; type: VideoType; lang: Lang; url: string }[] }

export function detectVideoType(url: string): VideoType {
  const lower = url.toLowerCase()
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube'
  const path = lower.split(/[?#]/)[0] ?? ''
  if (path.endsWith('.m3u8')) return 'hls'
  if (path.endsWith('.mp4')) return 'mp4'
  return 'embed'
}

export const CONFIG_FIELDS: Record<SourceType, { key: keyof SourceConfig; label: string; placeholder: string; required?: boolean }[]> = {
  rss: [],
  json: [
    { key: 'itemsPath', label: 'Ruta de elementos', placeholder: 'data.episodes', required: true },
    { key: 'titleField', label: 'Campo de título', placeholder: 'title', required: true },
    { key: 'urlField', label: 'Campo de enlace', placeholder: 'video_url', required: true },
  ],
  sitemap: [{ key: 'urlPattern', label: 'Patrón de URL', placeholder: '/ver/[^/]+-episodio-\\d+' }],
  html: [
    { key: 'itemSelector', label: 'Selector de elemento', placeholder: 'article.episode', required: true },
    { key: 'titleSelector', label: 'Selector de título', placeholder: 'h2.title', required: true },
    { key: 'linkSelector', label: 'Selector de enlace', placeholder: 'a.watch', required: true },
    { key: 'dateSelector', label: 'Selector de fecha', placeholder: 'time' },
  ],
}

export function regexError(pattern?: string): string | null {
  if (!pattern) return null
  try { new RegExp(pattern, 'i'); return null } catch (e) { return e instanceof Error ? e.message : 'Expresión inválida' }
}
