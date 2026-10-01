import { parse as parseHtml, type HTMLElement } from 'node-html-parser'
import { XMLParser } from 'fast-xml-parser'
import { detectVideoType, type DiscoveredContent, type DiscoveredChapter, type AnalysisResult } from './types'

// Peticiones educadas: timeout 10 s, AbortController, 1 reintento con backoff, sin evadir protecciones.
export async function politeFetch(url: string, accept = 'text/html,application/xhtml+xml'): Promise<string> {
  let lastError = 'Error desconocido'
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 1500))
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    try {
      const res = await fetch(url, { headers: { Accept: accept, 'Accept-Language': 'es,en;q=0.8', 'User-Agent': 'Mozilla/5.0 (compatible; AnimeOrbitBot/1.0)' }, signal: controller.signal, redirect: 'follow' })
      if (res.status === 403) throw new Error('403: el sitio bloquea el acceso')
      if (res.status === 404) throw new Error('404: página no encontrada')
      if (res.status === 429) { lastError = '429: demasiadas peticiones'; continue }
      if (res.status >= 500) { lastError = `${res.status}: error del servidor`; continue }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.text()
      if (!body.trim()) throw new Error('Respuesta vacía')
      if (/cf-browser-verification|challenge-platform|captcha/i.test(body.slice(0, 5000)) && body.length < 30000) throw new Error('El sitio exige verificación humana; no se puede analizar')
      return body
    } catch (e) {
      const msg = e instanceof Error ? (e.name === 'AbortError' ? 'Tiempo de espera agotado (10 s)' : e.message) : String(e)
      if (/^(403|404)|verificación|vacía/.test(msg)) throw new Error(msg)
      lastError = /fetch failed|ENOTFOUND|getaddrinfo|DNS/i.test(msg) ? `No se pudo conectar: ${msg}` : msg
    } finally { clearTimeout(timer) }
  }
  throw new Error(lastError)
}

const EP_TEXT = /(?:cap[ií]tulo|episodio|episode|cap|ep)\.?\s*[-#]?\s*0*(\d{1,4})\b/i
const EP_URL = /(?:cap[ií]tulo|episodio|episode|cap|ep)[-_/]?0*(\d{1,4})(?:\b|[-_/.]|$)/i
const CARD_CLASS = /item|card|post|video|content|anime|serie|show|entry|thumb|movie/i

const abs = (href: string | undefined | null, base: string) => { if (!href) return null; try { const u = new URL(href.trim(), base); return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString().split('#')[0] ?? null : null } catch { return null } }
const clean = (s: string | undefined | null) => (s ?? '').replace(/\s+/g, ' ').trim()
const meta = (root: HTMLElement, names: string[]) => { for (const n of names) { const el = root.querySelector(`meta[property="${n}"]`) ?? root.querySelector(`meta[name="${n}"]`); const v = clean(el?.getAttribute('content')); if (v) return v } return null }
function imgSrc(el: HTMLElement | null, base: string) {
  if (!el) return null
  for (const a of ['data-src', 'data-lazy-src', 'data-original', 'src']) { const v = el.getAttribute(a); if (v && !v.startsWith('data:')) return abs(v, base) }
  const set = el.getAttribute('srcset') ?? el.getAttribute('data-srcset')
  if (set) return abs(set.split(',').pop()?.trim().split(' ')[0], base)
  const style = el.getAttribute('style')?.match(/url\(['"]?([^'")]+)/)
  return style ? abs(style[1], base) : null
}
export function episodeOf(text: string, url: string): number | null {
  const t = text.match(EP_TEXT) ?? (() => { try { return new URL(url).pathname.match(EP_URL) } catch { return null } })()
  if (t?.[1]) return Number(t[1])
  const bare = clean(text).match(/^0*(\d{1,4})$/)
  return bare?.[1] ? Number(bare[1]) : null
}
export const stableKey = (url: string | null, title: string) => {
  if (url) { try { const p = new URL(url).pathname.replace(/\/+$/, ''); if (p && p !== '') return p.toLowerCase() } catch { /* usar título */ } }
  return title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

type Card = { title: string; url: string | null; cover: string | null; description: string | null }

function fromJsonLd(root: HTMLElement, base: string): Card[] {
  const out: Card[] = []
  const visit = (n: unknown) => {
    if (!n || typeof n !== 'object') return
    if (Array.isArray(n)) { n.forEach(visit); return }
    const o = n as Record<string, unknown>
    const type = String(o['@type'] ?? '')
    if (/TVSeries|Movie|CreativeWork|VideoObject|Series/i.test(type) && typeof o['name'] === 'string') {
      const img = o['image']; const image = typeof img === 'string' ? img : Array.isArray(img) ? String(img[0] ?? '') : (img && typeof img === 'object' ? String((img as Record<string, unknown>)['url'] ?? '') : '')
      out.push({ title: clean(String(o['name'])), url: abs(typeof o['url'] === 'string' ? o['url'] : null, base), cover: abs(image, base), description: typeof o['description'] === 'string' ? clean(o['description']) : null })
    }
    for (const k of ['itemListElement', 'item', '@graph']) if (o[k]) visit(o[k])
  }
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) { try { visit(JSON.parse(s.text)) } catch { /* JSON inválido: ignorar */ } }
  return out
}

function fromRepeatedCards(root: HTMLElement, base: string): Card[] {
  const groups = new Map<string, HTMLElement[]>()
  for (const el of root.querySelectorAll('article, li, div, a')) {
    const cls = el.getAttribute('class') ?? ''
    if (el.rawTagName !== 'article' && el.rawTagName !== 'li' && !CARD_CLASS.test(cls)) continue
    if (!el.querySelector('img') && !el.querySelector('h1,h2,h3,h4,h5')) continue
    if (el.rawTagName !== 'a' && !el.querySelector('a[href]')) continue
    const sig = `${el.parentNode && (el.parentNode as HTMLElement).rawTagName}>${el.rawTagName}.${cls.split(/\s+/).filter(c => !/\d/.test(c)).sort().join('.')}`
    groups.set(sig, [...(groups.get(sig) ?? []), el])
  }
  const best = [...groups.values()].filter(g => g.length >= 3).sort((a, b) => b.length - a.length)
  for (const group of best) {
    const cards = group.map(el => {
      const a = el.rawTagName === 'a' ? el : el.querySelector('a[href]')
      const img = el.querySelector('img') ?? el.querySelector('[data-src],[style*="url("]')
      const heading = el.querySelector('h1,h2,h3,h4,h5,.title,[class*="title"]')
      const title = clean(heading?.text) || clean(img?.getAttribute('alt')) || clean(a?.getAttribute('title')) || clean(a?.text)
      return { title, url: abs(a?.getAttribute('href'), base), cover: imgSrc(img, base), description: clean(el.querySelector('p,.description,[class*="desc"],[class*="synopsis"]')?.text) || null }
    }).filter(c => c.title && c.url)
    // Si casi todas las tarjetas son capítulos de una misma serie, no son contenidos distintos.
    const epLike = cards.filter(c => episodeOf(c.title, c.url ?? '') != null).length
    if (cards.length >= 3 && epLike < cards.length * 0.6) return [...new Map(cards.map(c => [c.url, c])).values()]
  }
  return []
}

function chaptersFrom(root: HTMLElement, base: string, pageUrl: string): DiscoveredChapter[] {
  const map = new Map<number, DiscoveredChapter>()
  for (const a of root.querySelectorAll('a[href]')) {
    const url = abs(a.getAttribute('href'), base)
    if (!url || url === pageUrl) continue
    const label = clean(a.getAttribute('title')) || clean(a.text)
    const ep = episodeOf(label, url)
    if (ep == null || ep > 5000) continue
    const direct = /youtube\.com|youtu\.be|\.m3u8|\.mp4/i.test(url)
    if (!map.has(ep)) map.set(ep, { episode: ep, title: label && label.length < 120 ? label : null, pageUrl: url, playUrl: direct ? url : null, type: direct ? detectVideoType(url) : null })
  }
  return [...map.values()].sort((a, b) => a.episode - b.episode)
}

export function playerFrom(html: string, base: string): string | null {
  const root = parseHtml(html)
  const og = meta(root, ['og:video:secure_url', 'og:video:url', 'og:video'])
  const candidates = [og, ...root.querySelectorAll('iframe[src], iframe[data-src], video[src], video source[src]').map(e => e.getAttribute('src') ?? e.getAttribute('data-src'))]
  for (const c of candidates) { const u = abs(c, base); if (u && u.startsWith('https://')) return u }
  const m = html.match(/https:\/\/[^"'\s\\]+?\.(?:m3u8|mp4)(?:\?[^"'\s\\]*)?/i)
  return m ? m[0] : null
}

async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => { while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx] as T); await new Promise(r => setTimeout(r, 400)) } }))
  return out
}

function fromFeed(xml: string, base: string): DiscoveredContent[] {
  const doc = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }).parse(xml) as Record<string, any>
  const raw: { title: string; link: string }[] = []
  const items = doc?.['rss']?.channel?.item ?? doc?.['feed']?.entry ?? []
  for (const it of Array.isArray(items) ? items : [items]) {
    const link = typeof it.link === 'string' ? it.link : Array.isArray(it.link) ? it.link[0]?.['@_href'] : it.link?.['@_href']
    const title = typeof it.title === 'string' ? it.title : it.title?.['#text']
    if (link && title) raw.push({ title: clean(title), link: abs(link, base) ?? '' })
  }
  const byTitle = new Map<string, DiscoveredContent>()
  for (const r of raw) {
    const ep = episodeOf(r.title, r.link)
    if (ep == null) continue
    const name = clean(r.title.replace(EP_TEXT, ' ').replace(/[-–|:·]+\s*$/, '')) || r.title
    const key = stableKey(null, name)
    const c = byTitle.get(key) ?? { key, title: name, url: null, cover: null, description: null, chapters: [] }
    if (!c.chapters.some(x => x.episode === ep)) c.chapters.push({ episode: ep, title: r.title, pageUrl: r.link, playUrl: /youtube|\.m3u8|\.mp4/i.test(r.link) ? r.link : null, type: /youtube|\.m3u8|\.mp4/i.test(r.link) ? detectVideoType(r.link) : null })
    byTitle.set(key, c)
  }
  return [...byTitle.values()].map(c => ({ ...c, chapters: c.chapters.sort((a, b) => a.episode - b.episode) }))
}

/**
 * Analiza una web: WEB → CONTENIDOS → METADATOS → CAPÍTULOS → REPRODUCCIÓN.
 * `knownPlay` contiene URLs de páginas de capítulo cuya reproducción ya conocemos, para no volver a pedirlas.
 */
export async function analyzeSite(url: string, opts: { knownPlay?: (contentKey: string, episode: number) => string | undefined; maxContents?: number; maxPlayerFetches?: number } = {}): Promise<AnalysisResult> {
  const errors: string[] = []
  const html = await politeFetch(url)
  const root = parseHtml(html)
  if (!root.querySelector('body') && !root.querySelector('a')) throw new Error('HTML incompleto o no válido')
  let strategy = 'tarjetas'
  let cards = fromJsonLd(root, url).filter(c => c.url)
  if (cards.length >= 2) strategy = 'json-ld'
  else cards = fromRepeatedCards(root, url)

  let contents: DiscoveredContent[] = []
  const ownChapters = chaptersFrom(root, url, url)
  if (cards.length === 0 && ownChapters.length >= 1) {
    // La propia URL es la ficha de un contenido.
    strategy = 'ficha individual'
    const title = meta(root, ['og:title', 'twitter:title']) ?? clean(root.querySelector('h1')?.text) ?? clean(root.querySelector('title')?.text)
    contents = [{ key: stableKey(url, title ?? ''), title: title ?? 'Sin título', url, cover: meta(root, ['og:image', 'twitter:image']) ?? imgSrc(root.querySelector('img'), url), description: meta(root, ['og:description', 'description', 'twitter:description']), chapters: ownChapters }]
  }
  if (cards.length === 0 && contents.length === 0) {
    const feedHref = root.querySelector('link[type="application/rss+xml"]')?.getAttribute('href') ?? root.querySelector('link[type="application/atom+xml"]')?.getAttribute('href')
    const feedUrl = abs(feedHref, url)
    if (feedUrl) { try { contents = fromFeed(await politeFetch(feedUrl, 'application/rss+xml,application/xml'), url); strategy = 'rss' } catch (e) { errors.push(`Feed: ${e instanceof Error ? e.message : e}`) } }
  }
  if (cards.length) {
    const list = cards.slice(0, opts.maxContents ?? 40)
    contents = (await pool(list, 3, async (card): Promise<DiscoveredContent | null> => {
      try {
        if (!card.url) return null
        const page = parseHtml(await politeFetch(card.url))
        return {
          key: stableKey(card.url, card.title),
          title: card.title || meta(page, ['og:title']) || 'Sin título',
          url: card.url,
          cover: card.cover ?? meta(page, ['og:image', 'twitter:image']),
          description: meta(page, ['og:description', 'description', 'twitter:description']) ?? card.description,
          chapters: chaptersFrom(page, card.url, card.url),
        }
      } catch (e) {
        errors.push(`${card.title}: ${e instanceof Error ? e.message : e}`)
        return { key: stableKey(card.url, card.title), title: card.title, url: card.url, cover: card.cover, description: card.description, chapters: [], failed: true }
      }
    })).filter((c): c is DiscoveredContent => c !== null)
  }

  // Resolver la URL real de reproducción de capítulos, con un tope de peticiones por análisis.
  let budget = opts.maxPlayerFetches ?? 30
  const pending: DiscoveredChapter[] = []
  for (const c of contents) for (const ch of c.chapters) {
    if (ch.playUrl) continue
    const known = opts.knownPlay?.(c.key, ch.episode)
    if (known) { ch.playUrl = known; ch.type = detectVideoType(known) } else pending.push(ch)
  }
  await pool(pending.slice(-budget), 3, async ch => {
    budget--
    try { const p = playerFrom(await politeFetch(ch.pageUrl), ch.pageUrl); if (p) { ch.playUrl = p; ch.type = detectVideoType(p) } } catch (e) { errors.push(`Capítulo ${ch.episode}: ${e instanceof Error ? e.message : e}`) }
  })
  return { strategy, contents, errors }
}
