import { parse as parseHtml, type HTMLElement } from 'node-html-parser'
import { politeFetch } from './discovery.server'

export type PlayerKind = 'iframe' | 'youtube' | 'mp4' | 'hls'
export type PlayerLang = 'sub' | 'latino' | null
export type PlayerOption = { label: string; lang: PlayerLang; kind: PlayerKind; url: string }

const LATINO = /latino|lat\b|audio\s*español|doblad|castellano|\besp\b/i
const SUB = /sub(titulad|\s*esp|\b)|vose|japon/i

export function kindOfUrl(url: string): PlayerKind {
  const l = url.toLowerCase(); const path = l.split(/[?#]/)[0] ?? ''
  if (l.includes('youtube.com') || l.includes('youtu.be')) return 'youtube'
  if (path.endsWith('.m3u8')) return 'hls'
  if (path.endsWith('.mp4')) return 'mp4'
  return 'iframe'
}
export const langOf = (text: string): PlayerLang => (LATINO.test(text) ? 'latino' : SUB.test(text) ? 'sub' : null)

const absHttps = (v: string | null | undefined, base: string) => {
  if (!v) return null
  let s = v.trim()
  if (!/^(https?:)?\/\//i.test(s) && /^[A-Za-z0-9+/=]{24,}$/.test(s)) { try { s = atob(s) } catch { /* no es base64 */ } }
  try { const u = new URL(s, base); return u.protocol === 'https:' ? u.toString() : null } catch { return null }
}
const IGNORE = /facebook\.com\/plugins|disqus|googletagmanager|doubleclick|recaptcha|twitter\.com\/widgets|about:blank/i

function contextText(el: HTMLElement, root: HTMLElement): string {
  const parts: string[] = []
  let n: HTMLElement | null = el
  for (let i = 0; i < 5 && n; i++) {
    parts.push(n.getAttribute('id') ?? '', n.getAttribute('class') ?? '', n.getAttribute('data-lang') ?? '', n.getAttribute('title') ?? '')
    const id = n.getAttribute('id')
    if (id) { const tab = root.querySelector(`[href="#${id}"],[data-tab="${id}"],[data-target="#${id}"],[aria-controls="${id}"]`); if (tab) parts.push(tab.text) }
    n = n.parentNode as HTMLElement | null
  }
  return parts.join(' ')
}

/** Lee la página original del episodio y devuelve todos los reproductores reales encontrados, separados por idioma. */
export async function resolvePlayers(pageUrl: string): Promise<PlayerOption[]> {
  const html = await politeFetch(pageUrl)
  const root = parseHtml(html)
  const found: { url: string; ctx: string; name: string }[] = []
  // 1. Opciones de servidor con la URL en atributos (pestañas / listas de servidores).
  for (const el of root.querySelectorAll('[data-video],[data-player],[data-embed],[data-url],[data-src],[data-link]')) {
    if (el.rawTagName === 'img' || el.rawTagName === 'script') continue
    const raw = el.getAttribute('data-video') ?? el.getAttribute('data-player') ?? el.getAttribute('data-embed') ?? el.getAttribute('data-url') ?? el.getAttribute('data-link') ?? el.getAttribute('data-src')
    const url = absHttps(raw, pageUrl)
    if (url && !IGNORE.test(url) && !/\.(jpe?g|png|webp|gif|svg|css|js)(\?|$)/i.test(url)) found.push({ url, ctx: `${el.text} ${contextText(el, root)}`, name: el.text.replace(/\s+/g, ' ').trim() })
  }
  // 2. Iframes y videos incrustados.
  for (const el of root.querySelectorAll('iframe, video, video source')) {
    const url = absHttps(el.getAttribute('src') ?? el.getAttribute('data-src') ?? el.getAttribute('data-lazy-src'), pageUrl)
    if (url && !IGNORE.test(url)) found.push({ url, ctx: contextText(el, root), name: '' })
  }
  // 3. Temas tipo Dooplay: el iframe se pide por AJAX.
  const doo = root.querySelectorAll('[data-post][data-nume][data-type]')
  if (doo.length) {
    const origin = new URL(pageUrl).origin
    for (const el of doo.slice(0, 8)) {
      try {
        const body = new URLSearchParams({ action: 'doo_player_ajax', post: el.getAttribute('data-post') ?? '', nume: el.getAttribute('data-nume') ?? '', type: el.getAttribute('data-type') ?? '' })
        const res = await fetch(`${origin}/wp-admin/admin-ajax.php`, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: pageUrl, 'User-Agent': 'Mozilla/5.0 (compatible; AnimeOrbitBot/1.0)' } })
        const j = (await res.json()) as { embed_url?: string }
        const src = j.embed_url?.includes('<iframe') ? parseHtml(j.embed_url).querySelector('iframe')?.getAttribute('src') : j.embed_url
        const url = absHttps(src, pageUrl)
        if (url) found.push({ url, ctx: el.text, name: el.text.replace(/\s+/g, ' ').trim() })
      } catch { /* opción no disponible */ }
    }
  }
  // 4. Archivos directos dentro de scripts.
  for (const m of html.matchAll(/https:\/\/[^"'\s\\]+?\.(?:m3u8|mp4)(?:\?[^"'\s\\]*)?/gi)) found.push({ url: m[0], ctx: '', name: '' })

  const seen = new Set<string>(); const out: PlayerOption[] = []
  const pageHost = new URL(pageUrl).host
  for (const f of found) {
    if (seen.has(f.url)) continue
    const host = new URL(f.url).host
    if (host === pageHost && kindOfUrl(f.url) === 'iframe' && !/embed|player|video/i.test(f.url)) continue // otra página del mismo sitio
    seen.add(f.url)
    const kind = kindOfUrl(f.url); const lang = langOf(f.ctx)
    const server = f.name && f.name.length < 30 ? f.name : host.replace(/^www\./, '').split('.')[0] ?? 'Servidor'
    out.push({ url: f.url, kind, lang, label: server })
  }
  return out.slice(0, 20)
}
