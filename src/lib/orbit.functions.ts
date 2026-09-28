import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'

function publicClient() {
  // Loaded only in handlers; public reads stay behind database policies.
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? ''
  const url = process.env['SUPABASE_URL'] ?? ''
  return import('@supabase/supabase-js').then(({ createClient }) => createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (headers.get('Authorization') === `Bearer ${key}` && key.startsWith('sb_')) headers.delete('Authorization'); headers.set('apikey',key); return fetch(input, { ...init, headers }) } } }))
}
export const getHome = createServerFn({ method: 'GET' }).handler(async () => {
  const db = await publicClient()
  const [{ data: animes, error }, { data: runs }] = await Promise.all([db.from('animes').select('*').order('release_at', { ascending: true, nullsFirst: false }).limit(90), db.from('sync_runs').select('*').order('started_at', { ascending: false }).limit(1)])
  if (error) throw error
  return { animes: animes ?? [], lastRun: runs?.[0] ?? null }
})
export const getVideos = createServerFn({ method: 'GET' }).handler(async () => {
  const db = await publicClient()
  const { data, error } = await db.from('video_animes').select('*,video_episodes(number)').order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
})
export const getVideo = createServerFn({ method: 'GET' }).inputValidator((v: string) => z.string().uuid().parse(v)).handler(async ({ data }) => {
  const db = await publicClient()
  const { data: anime, error } = await db.from('video_animes').select('*,video_episodes(id,number,title,video_sources(id,label,kind,url))').eq('id',data).maybeSingle()
  if (error) throw error
  return anime
})
export const getSaved = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from('saved_animes').select('anime_id,animes(*)').eq('user_id', context.userId).order('created_at',{ ascending:false })
  if (error) throw error
  return data ?? []
})
export const toggleSaved = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: { id: string; saved: boolean }) => z.object({id:z.string().uuid(),saved:z.boolean()}).parse(v)).handler(async ({ context, data }) => {
  const result = data.saved ? await context.supabase.from('saved_animes').delete().eq('user_id',context.userId).eq('anime_id',data.id) : await context.supabase.from('saved_animes').insert({ user_id:context.userId,anime_id:data.id })
  if (result.error) throw result.error
  return { saved: !data.saved }
})
export const getProfile = createServerFn({ method:'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data } = await context.supabase.from('profiles').select('*').eq('id',context.userId).maybeSingle()
  return data
})
export const saveProfile = createServerFn({ method:'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: { timezone: string; theme: string; notifications: Record<string,boolean> }) => z.object({timezone:z.string().max(80),theme:z.enum(['dark','light']),notifications:z.record(z.boolean())}).parse(v)).handler(async ({ context,data }) => {
  const { error } = await context.supabase.from('profiles').upsert({ id:context.userId,...data })
  if (error) throw error
  return { ok:true }
})
export const getAdmin = createServerFn({ method:'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: allowed } = await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'})
  if (!allowed) throw new Error('Acceso restringido')
  const [runs,sources,discoveries,changes,videos] = await Promise.all([
    context.supabase.from('sync_runs').select('*').order('started_at',{ascending:false}).limit(25),
    context.supabase.from('video_sources_catalog').select('*').order('created_at',{ascending:false}),
    context.supabase.from('discoveries').select('*').order('detected_at',{ascending:false}).limit(20),
    context.supabase.from('anime_changes').select('*').eq('conflict',true).order('created_at',{ascending:false}).limit(20),
    context.supabase.from('video_animes').select('id,title,source_name,last_synced_at,last_sync_error').order('updated_at',{ascending:false}).limit(30)
  ])
  return { runs:runs.data ?? [],sources:sources.data ?? [],discoveries:discoveries.data ?? [],changes:changes.data ?? [],videos:videos.data ?? [] }
})
export const adminAction = createServerFn({ method:'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: { action: 'sync'|'videos'|'add'|'remove'|'toggle'; id?: string; name?: string; url?: string; kind?: 'iframe'|'youtube'|'external'; enabled?: boolean }) => z.object({action:z.enum(['sync','videos','add','remove','toggle']),id:z.string().uuid().optional(),name:z.string().max(100).optional(),url:z.string().url().optional(),kind:z.enum(['iframe','youtube','external']).optional(),enabled:z.boolean().optional()}).parse(v)).handler(async ({ context,data }) => {
  const { data: allowed } = await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'})
  if (!allowed) throw new Error('Acceso restringido')
  if (data.action === 'sync' || data.action === 'videos') {
    if (data.action === 'sync') { const { runAnimeSync } = await import('@/lib/sync/anime.server'); return await runAnimeSync('manual') }
    const { runVideoSync } = await import('@/lib/sync/videos.server'); return await runVideoSync('manual-videos')
  }
  if (data.action === 'add') {
    if (!data.name || !data.url || !data.kind || new URL(data.url).protocol !== 'https:') throw new Error('Indica nombre, dirección HTTPS y tipo')
    const response = await fetch(data.url,{ method:'GET',signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'} })
    if (!response.ok) throw new Error(`La fuente no responde: ${response.status}`)
    const feed = await response.json() as { anime?: unknown }
    if (!Array.isArray(feed.anime)) throw new Error('La fuente no ofrece un catálogo compatible')
    const { error } = await context.supabase.from('video_sources_catalog').insert({name:data.name,base_url:data.url,kind:data.kind})
    if (error) throw error
  } else if (data.id) {
    const query = context.supabase.from('video_sources_catalog')
    const result = data.action === 'remove' ? await query.delete().eq('id',data.id) : await query.update({enabled:data.enabled ?? false}).eq('id',data.id)
    if (result.error) throw result.error
  }
  return { ok:true }
})
