import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'

const regex = z.string().max(300).optional().refine(v => { if (!v) return true; try { new RegExp(v); return true } catch { return false } }, 'Expresión regular inválida')
const configSchema = z.object({
  episodeRegex: regex, langDefault: z.enum(['sub', 'dub', 'neutro']).optional(),
  itemsPath: z.string().max(200).optional(), titleField: z.string().max(100).optional(), urlField: z.string().max(100).optional(),
  urlPattern: regex, itemSelector: z.string().max(200).optional(), titleSelector: z.string().max(200).optional(), linkSelector: z.string().max(200).optional(), dateSelector: z.string().max(200).optional(),
  includePattern: regex, excludePattern: regex,
})
const providerInput = z.object({
  id: z.string().uuid().optional(), name: z.string().trim().min(1).max(100), baseUrl: z.string().url().refine(u => u.startsWith('https://'), 'Usa una dirección HTTPS'),
  type: z.enum(['rss', 'json', 'sitemap', 'html']), config: configSchema, enabled: z.boolean(), scanIntervalMinutes: z.number().int().min(5).max(10080).nullable(),
}).superRefine((v, ctx) => {
  if (v.type === 'json' && (!v.config.itemsPath || !v.config.titleField || !v.config.urlField)) ctx.addIssue({ code: 'custom', message: 'Completa ruta, título y enlace' })
  if (v.type === 'html' && (!v.config.itemSelector || !v.config.titleSelector || !v.config.linkSelector)) ctx.addIssue({ code: 'custom', message: 'Completa los tres selectores' })
})
type ProviderInput = z.infer<typeof providerInput>

async function assertAdmin(context: { supabase: import('@supabase/supabase-js').SupabaseClient<import('@/integrations/supabase/types').Database>; userId: string }) {
  const { data } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' })
  if (!data) throw new Error('Acceso restringido')
}
const clean = (c: ProviderInput['config']) => Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined && v !== ''))
const toTemp = (d: ProviderInput) => ({ id: d.id ?? '00000000-0000-0000-0000-000000000000', name: d.name, baseUrl: d.baseUrl, type: d.type, config: clean(d.config), enabled: d.enabled, scanIntervalMinutes: d.scanIntervalMinutes, lastScanAt: null, lastScanStatus: null, lastScanMessage: null, lastScanFound: 0, lastScanNew: 0 })

export const listSources = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context)
  const { rowToProvider } = await import('@/lib/sources/engine.server')
  const [p, s] = await Promise.all([
    context.supabase.from('source_providers').select('*').order('created_at', { ascending: false }),
    context.supabase.from('app_settings').select('value').eq('key', 'scan_interval_minutes').maybeSingle(),
  ])
  if (p.error) throw p.error
  return { providers: (p.data ?? []).map(rowToProvider), globalInterval: Number(s.data?.value ?? 60) || 60 }
})

export const saveSource = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: ProviderInput) => providerInput.parse(v)).handler(async ({ context, data }) => {
  await assertAdmin(context)
  const row = { name: data.name, base_url: data.baseUrl, type: data.type, config: clean(data.config), enabled: data.enabled, scan_interval_minutes: data.scanIntervalMinutes }
  const res = data.id ? await context.supabase.from('source_providers').update(row).eq('id', data.id) : await context.supabase.from('source_providers').insert(row)
  if (res.error) throw res.error
  return { ok: true }
})

export const deleteSource = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: string) => z.string().uuid().parse(v)).handler(async ({ context, data }) => {
  await assertAdmin(context)
  const { error } = await context.supabase.from('source_providers').delete().eq('id', data)
  if (error) throw error
  return { ok: true }
})

export const toggleSource = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: { id: string; enabled: boolean }) => z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(v)).handler(async ({ context, data }) => {
  await assertAdmin(context)
  const { error } = await context.supabase.from('source_providers').update({ enabled: data.enabled }).eq('id', data.id)
  if (error) throw error
  return { ok: true }
})

export const testSource = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: ProviderInput) => providerInput.parse(v)).handler(async ({ context, data }) => {
  await assertAdmin(context)
  const { testProvider } = await import('@/lib/sources/engine.server')
  return testProvider(toTemp(data), context.supabase)
})

export const scanSource = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: string) => z.string().uuid().parse(v)).handler(async ({ context, data }) => {
  await assertAdmin(context)
  const { rowToProvider, syncProvider } = await import('@/lib/sources/engine.server')
  const { data: row, error } = await context.supabase.from('source_providers').select('*').eq('id', data).single()
  if (error) throw error
  return syncProvider(rowToProvider(row), context.supabase)
})

export const setGlobalInterval = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: number) => z.number().int().min(5).max(10080).parse(v)).handler(async ({ context, data }) => {
  await assertAdmin(context)
  const { error } = await context.supabase.from('app_settings').upsert({ key: 'scan_interval_minutes', value: data, updated_at: new Date().toISOString() })
  if (error) throw error
  return { ok: true }
})

export const listDiscovered = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context)
  const { data, error } = await context.supabase.from('discovered_episodes').select('*').order('detected_at', { ascending: false }).limit(1000)
  if (error) throw error
  return data ?? []
})

export const deleteDiscovered = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: string[]) => z.array(z.string().min(1).max(64)).min(1).max(1000).parse(v)).handler(async ({ context, data }) => {
  await assertAdmin(context)
  const { error } = await context.supabase.from('discovered_episodes').delete().in('id', data)
  if (error) throw error
  return { ok: true }
})

export const markDiscoveredSeen = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((v: string[]) => z.array(z.string().min(1).max(64)).min(1).max(1000).parse(v)).handler(async ({ context, data }) => {
  await assertAdmin(context)
  const { error } = await context.supabase.from('discovered_episodes').update({ is_new: false }).in('id', data)
  if (error) throw error
  return { ok: true }
})
