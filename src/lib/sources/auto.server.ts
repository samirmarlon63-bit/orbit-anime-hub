import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import { analyzeSite } from './discovery.server'
import type { AnalysisPreview, AnalysisResult, ScanResult, SourceProvider } from './types'

type Db = SupabaseClient<Database>
const normKey = (s: string) => s.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const kindOf = (t: string | null) => (t === 'youtube' ? 'youtube' : t === 'embed' ? 'iframe' : 'external') as 'youtube' | 'iframe' | 'external'

export function previewOf(a: AnalysisResult): AnalysisPreview {
  return { strategy: a.strategy, contents: a.contents.map(c => ({ title: c.title, cover: c.cover, hasDescription: !!c.description, chapters: c.chapters.length, playable: c.chapters.filter(ch => ch.playUrl).length, first: c.chapters[0]?.episode ?? null, last: c.chapters[c.chapters.length - 1]?.episode ?? null })) }
}

export async function testAuto(p: SourceProvider): Promise<ScanResult> {
  try {
    const a = await analyzeSite(p.baseUrl, { maxPlayerFetches: 6, maxContents: 20 })
    const chapters = a.contents.reduce((n, c) => n + c.chapters.length, 0)
    return { found: a.contents.length, new: 0, updated: 0, contents: a.contents.length, chapters, errors: a.contents.length ? a.errors.slice(0, 10) : ['No se detectaron contenidos en esta página', ...a.errors.slice(0, 5)], analysis: previewOf(a) }
  } catch (e) { return { found: 0, new: 0, updated: 0, errors: [e instanceof Error ? e.message : String(e)] } }
}

/** Sincronización incremental y no destructiva: solo inserta o actualiza, nunca elimina. */
export async function syncAuto(p: SourceProvider, admin: Db): Promise<ScanResult> {
  const sourceName = `orbit:${p.id}`
  // Reproducciones ya conocidas para no repetir peticiones.
  const { data: knownRows } = await admin.from('video_animes').select('external_slug,video_episodes(number,video_sources(url,label,kind))').eq('source_name', sourceName)
  const known = new Map<string, string>()
  for (const v of knownRows ?? []) for (const e of v.video_episodes ?? []) for (const s of e.video_sources ?? []) if (s.label === p.name && s.kind !== 'external') known.set(`${v.external_slug}|${Number(e.number)}`, s.url)
  const analysis = await analyzeSite(p.baseUrl, { knownPlay: (k, ep) => known.get(`${k}|${ep}`) })
  const result: ScanResult = { found: analysis.contents.length, new: 0, updated: 0, contents: analysis.contents.length, chapters: 0, newContents: 0, errors: [...analysis.errors] }
  if (!analysis.contents.length) throw new Error(['No se detectaron contenidos; se conservan los datos existentes', ...analysis.errors.slice(0, 3)].join(' · '))

  const { data: catalog } = await admin.from('animes').select('id,search_keys').limit(3000)
  for (const c of analysis.contents) {
    try {
      const key = normKey(c.title)
      const original = catalog?.find(a => (a.search_keys ?? []).includes(key))
      const { data: existing } = await admin.from('video_animes').select('id,title,cover_url,synopsis').eq('source_name', sourceName).eq('external_slug', c.key).maybeSingle()
      let videoId = existing?.id
      if (!existing) {
        const { data: created, error } = await admin.from('video_animes').insert({ title: c.title, cover_url: c.cover, synopsis: c.description, external_slug: c.key, source_name: sourceName, anime_id: original?.id ?? null, status: 'airing', episodes_total: c.chapters.length || null, last_synced_at: new Date().toISOString() }).select('id').single()
        if (error || !created) throw error ?? new Error('No se pudo crear el contenido')
        videoId = created.id; result.newContents = (result.newContents ?? 0) + 1
      } else {
        // Solo actualizar metadatos con valores nuevos no vacíos; nunca borrar capítulos.
        const patch: Database['public']['Tables']['video_animes']['Update'] = { last_synced_at: new Date().toISOString(), last_sync_error: c.failed ? 'La ficha no respondió en este escaneo' : null }
        if (c.title && c.title !== existing.title) patch.title = c.title
        if (c.cover && c.cover !== existing.cover_url) patch.cover_url = c.cover
        if (c.description && c.description !== existing.synopsis) patch.synopsis = c.description
        if (c.chapters.length) patch.episodes_total = c.chapters.length
        await admin.from('video_animes').update(patch).eq('id', existing.id)
      }
      if (!videoId || c.failed) continue
      const { data: eps } = await admin.from('video_episodes').select('id,number,video_sources(id,url,label)').eq('video_anime_id', videoId)
      const byNum = new Map((eps ?? []).map(e => [Number(e.number), e]))
      for (const ch of c.chapters) {
        result.chapters = (result.chapters ?? 0) + 1
        let ep = byNum.get(ch.episode)
        if (!ep) {
          const { data: created, error } = await admin.from('video_episodes').insert({ video_anime_id: videoId, number: ch.episode, title: ch.title }).select('id,number,video_sources(id,url,label)').single()
          if (error || !created) { result.errors.push(`${c.title} cap. ${ch.episode}: ${error?.message ?? 'no guardado'}`); continue }
          ep = created; result.new++
          await admin.from('video_changes').insert({ video_anime_id: videoId, kind: 'episode_added', new_value: { number: ch.episode }, source_name: p.name })
        }
        const url = ch.playUrl ?? ch.pageUrl
        if (!url.startsWith('https://')) continue
        const mine = ep.video_sources.find(s => s.label === p.name)
        if (!mine) await admin.from('video_sources').insert({ episode_id: ep.id, label: p.name, kind: kindOf(ch.playUrl ? ch.type : null), url })
        else if (mine.url !== url && (ch.playUrl || !/^https:\/\//.test(mine.url))) {
          await admin.from('video_sources').update({ url, kind: kindOf(ch.playUrl ? ch.type : null) }).eq('id', mine.id)
          await admin.from('video_changes').insert({ video_anime_id: videoId, kind: 'source_changed', old_value: { url: mine.url }, new_value: { url }, source_name: p.name })
          result.updated++
        }
      }
    } catch (e) { result.errors.push(`${c.title}: ${e instanceof Error ? e.message : String(e)}`) }
  }
  return result
}
