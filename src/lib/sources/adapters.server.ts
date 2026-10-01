import { XMLParser } from 'fast-xml-parser'
import { parse as parseHtml } from 'node-html-parser'
import type { RawItem, SourceProvider, SourceType } from './types'

export interface SourceAdapter { scan(provider: SourceProvider): Promise<RawItem[]> }

async function fetchText(url: string, accept: string): Promise<string> {
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    try {
      const res = await fetch(url, { headers: { Accept: accept, 'User-Agent': 'AnimeOrbit/1.0' }, signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (e) { lastError = e } finally { clearTimeout(timer) }
  }
  throw lastError instanceof Error ? lastError : new Error('No se pudo leer la fuente')
}

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text' })
const arr = <T,>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v])
const text = (v: unknown): string => {
  if (v == null) return ''
  if (typeof v === 'string' || typeof v === 'number') return String(v).trim()
  if (typeof v === 'object' && '#text' in (v as Record<string, unknown>)) return String((v as Record<string, unknown>)['#text']).trim()
  return ''
}

export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').filter(Boolean).reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), obj)
}

const rssAdapter: SourceAdapter = {
  async scan(p) {
    const doc = xml.parse(await fetchText(p.baseUrl, 'application/rss+xml, application/atom+xml, application/xml')) as Record<string, unknown>
    const rss = getPath(doc, 'rss.channel.item')
    if (rss) return arr(rss as Record<string, unknown>[]).map(i => ({ title: text(i['title']), url: text(i['link']), date: text(i['pubDate']) || null }))
    const entries = arr(getPath(doc, 'feed.entry') as Record<string, unknown>[])
    if (!entries.length && !getPath(doc, 'feed')) throw new Error('No es un feed RSS o Atom válido')
    return entries.map(e => {
      const links = arr(e['link'] as Record<string, unknown>[])
      const link = links.find(l => !l['@_rel'] || l['@_rel'] === 'alternate') ?? links[0]
      return { title: text(e['title']), url: link ? String(link['@_href'] ?? '') : '', date: text(e['updated']) || null }
    })
  },
}

const jsonAdapter: SourceAdapter = {
  async scan(p) {
    const data: unknown = JSON.parse(await fetchText(p.baseUrl, 'application/json'))
    const items = p.config.itemsPath ? getPath(data, p.config.itemsPath) : data
    if (!Array.isArray(items)) throw new Error(`La ruta "${p.config.itemsPath ?? ''}" no contiene una lista`)
    return items.map(i => ({ title: text(getPath(i, p.config.titleField ?? 'title')), url: text(getPath(i, p.config.urlField ?? 'url')) }))
  },
}

const sitemapAdapter: SourceAdapter = {
  async scan(p) {
    const read = async (url: string) => xml.parse(await fetchText(url, 'application/xml')) as Record<string, unknown>
    const doc = await read(p.baseUrl)
    let locs = arr(getPath(doc, 'urlset.url') as Record<string, unknown>[]).map(u => ({ url: text(u['loc']), date: text(u['lastmod']) || null }))
    const children = arr(getPath(doc, 'sitemapindex.sitemap') as Record<string, unknown>[]).map(s => text(s['loc'])).slice(0, 10)
    for (const child of children) {
      try { locs = locs.concat(arr(getPath(await read(child), 'urlset.url') as Record<string, unknown>[]).map(u => ({ url: text(u['loc']), date: text(u['lastmod']) || null }))) } catch { /* ignora sitemap hijo roto */ }
    }
    const re = p.config.urlPattern ? new RegExp(p.config.urlPattern, 'i') : null
    return locs.filter(l => !re || re.test(l.url)).map(l => {
      const slug = decodeURIComponent(new URL(l.url).pathname.split('/').filter(Boolean).pop() ?? '')
      return { title: slug.replace(/[-_]+/g, ' '), url: l.url, date: l.date }
    })
  },
}

const htmlAdapter: SourceAdapter = {
  async scan(p) {
    const root = parseHtml(await fetchText(p.baseUrl, 'text/html'))
    const c = p.config
    return root.querySelectorAll(c.itemSelector ?? 'article').map(el => {
      const titleEl = c.titleSelector ? el.querySelector(c.titleSelector) : el
      const linkEl = c.linkSelector ? el.querySelector(c.linkSelector) : el.querySelector('a')
      const href = linkEl?.getAttribute('href') ?? linkEl?.getAttribute('src') ?? ''
      let url = ''
      try { url = href ? new URL(href, p.baseUrl).toString() : '' } catch { url = '' }
      const dateEl = c.dateSelector ? el.querySelector(c.dateSelector) : null
      return { title: titleEl?.text.trim() ?? '', url, date: dateEl?.getAttribute('datetime') ?? dateEl?.text.trim() ?? null }
    })
  },
}

export const adapters: Record<Exclude<SourceType, 'auto'>, SourceAdapter> = { rss: rssAdapter, json: jsonAdapter, sitemap: sitemapAdapter, html: htmlAdapter }
