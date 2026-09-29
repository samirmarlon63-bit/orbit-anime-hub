import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Loader2, Pencil, Play, Plus, Power, RefreshCw, Trash2, FlaskConical, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { listSources, saveSource, deleteSource, toggleSource, testSource, scanSource, setGlobalInterval, listDiscovered, deleteDiscovered, markDiscoveredSeen } from '@/lib/sources.functions'
import { CONFIG_FIELDS, regexError, type SourceConfig, type SourceProvider, type SourceType, type ScanResult } from '@/lib/sources/types'

const input = 'h-11 w-full rounded-lg border border-border bg-card px-3 text-base outline-none focus:border-primary'
const typeStyle: Record<SourceType, string> = { rss: 'bg-primary/15 text-primary', json: 'bg-accent text-accent-foreground', sitemap: 'bg-secondary text-secondary-foreground', html: 'bg-muted text-muted-foreground' }
function ago(iso: string | null) { if (!iso) return 'Nunca'; const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? 'hace instantes' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d` }

type Draft = { id?: string; name: string; baseUrl: string; type: SourceType; config: SourceConfig; enabled: boolean; scanIntervalMinutes: number | null }
const emptyDraft: Draft = { name: '', baseUrl: '', type: 'rss', config: { langDefault: 'sub' }, enabled: true, scanIntervalMinutes: null }

function Skeleton() { return <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-card" />)}</div> }

export function SourcesPanel() {
  const [tab, setTab] = useState<'sources' | 'episodes'>('sources')
  return <section className="mb-10">
    <div className="mb-5 flex rounded-xl bg-card p-1 text-sm">{(['sources', 'episodes'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg py-2 transition ${tab === t ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>{t === 'sources' ? 'Fuentes' : 'Episodios detectados'}</button>)}</div>
    {tab === 'sources' ? <Sources /> : <Discovered />}
  </section>
}

function Sources() {
  const client = useQueryClient()
  const list = useServerFn(listSources), save = useServerFn(saveSource), del = useServerFn(deleteSource), toggle = useServerFn(toggleSource), test = useServerFn(testSource), scan = useServerFn(scanSource), setInterval_ = useServerFn(setGlobalInterval)
  const q = useQuery({ queryKey: ['sources'], queryFn: () => list(), retry: false })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [preview, setPreview] = useState<ScanResult | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [progress, setProgress] = useState<Record<string, 'pending' | 'running' | 'ok' | 'error'>>({})
  const running = useRef(false)
  const refresh = () => client.invalidateQueries({ queryKey: ['sources'] })

  const runScan = async (p: SourceProvider, quiet = false) => {
    setProgress(s => ({ ...s, [p.id]: 'running' }))
    try {
      const r = await scan({ data: p.id })
      setProgress(s => ({ ...s, [p.id]: r.errors.length ? 'error' : 'ok' }))
      if (!quiet) r.errors.length ? toast.error(`${p.name}: ${r.errors[0]}`) : toast.success(`${r.new} episodios nuevos de ${p.name}`)
      else if (r.new > 0) toast.success(`${r.new} episodios nuevos de ${p.name}`)
      if (r.new > 0) { client.invalidateQueries({ queryKey: ['video'] }); client.invalidateQueries({ queryKey: ['discovered'] }) }
    } catch (e) { setProgress(s => ({ ...s, [p.id]: 'error' })); if (!quiet) toast.error(e instanceof Error ? e.message : 'Error al escanear') }
  }
  const scanAll = async (onlyDue: boolean, quiet: boolean) => {
    if (running.current || !q.data) return
    const g = q.data.globalInterval
    const targets = q.data.providers.filter(p => p.enabled && (!onlyDue || !p.lastScanAt || Date.now() - new Date(p.lastScanAt).getTime() >= (p.scanIntervalMinutes ?? g) * 60000))
    if (!targets.length) { if (!quiet) toast.info('No hay fuentes activas'); return }
    running.current = true
    setProgress(Object.fromEntries(targets.map(t => [t.id, 'pending'])))
    for (const [i, p] of targets.entries()) { if (i) await new Promise(r => setTimeout(r, 2000)); await runScan(p, quiet) }
    running.current = false
    await refresh()
  }
  // Re-escaneo automático mientras la sesión admin está abierta.
  const scanRef = useRef(scanAll); scanRef.current = scanAll
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') void scanRef.current(true, true) }
    const id = window.setInterval(tick, 60000)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [])

  const errors = draft ? { url: /^https:\/\/.+/.test(draft.baseUrl) ? null : 'Usa una dirección HTTPS válida', episodeRegex: regexError(draft.config.episodeRegex), urlPattern: regexError(draft.config.urlPattern), includePattern: regexError(draft.config.includePattern), excludePattern: regexError(draft.config.excludePattern), fields: CONFIG_FIELDS[draft.type].filter(f => f.required && !draft.config[f.key]).length ? 'Completa los campos obligatorios' : null } : null
  const invalid = !draft || !draft.name.trim() || (errors ? Object.values(errors).some(Boolean) : true)
  const setCfg = (k: keyof SourceConfig, v: string) => setDraft(d => d && ({ ...d, config: { ...d.config, [k]: v || undefined } }))

  const onTest = async () => { if (!draft || invalid) return; setBusy('test'); setPreview(null); try { const r = await test({ data: draft }); setPreview(r); r.errors.length ? toast.error(r.errors[0]) : toast.success(`${r.found} elementos encontrados`) } catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo probar') } finally { setBusy(null) } }
  const onSave = async () => { if (!draft || invalid) return; setBusy('save'); try { await save({ data: draft }); toast.success('Fuente guardada'); setDraft(null); setPreview(null); await refresh() } catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo guardar') } finally { setBusy(null) } }

  if (q.isLoading) return <Skeleton />
  if (q.isError) return <div className="rounded-xl bg-card p-5 text-center text-sm"><p className="mb-3 text-destructive">{q.error instanceof Error ? q.error.message : 'No se pudieron cargar las fuentes'}</p><Button size="sm" variant="secondary" onClick={() => q.refetch()}><RefreshCw size={14} />Reintentar</Button></div>
  const d = q.data!
  return <>
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={() => { setDraft(emptyDraft); setPreview(null) }}><Plus size={14} />Añadir fuente</Button>
      <Button size="sm" variant="secondary" disabled={running.current} onClick={() => scanAll(false, false)}><RefreshCw size={14} />Escanear todo</Button>
      <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">Cada<input type="number" min={5} defaultValue={d.globalInterval} onBlur={async e => { const v = Number(e.target.value); if (v >= 5 && v !== d.globalInterval) { try { await setInterval_({ data: v }); toast.success('Intervalo actualizado'); refresh() } catch { toast.error('Intervalo inválido') } } }} className="h-9 w-16 rounded-lg border border-border bg-card px-2 text-base" />min</label>
    </div>
    {Object.keys(progress).length > 0 && <div className="mb-4 space-y-1.5">{d.providers.filter(p => progress[p.id]).map(p => <div key={p.id} className="flex items-center gap-2 text-xs"><span className="w-28 truncate">{p.name}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card"><div className={`h-full transition-all duration-500 ${progress[p.id] === 'error' ? 'bg-destructive' : 'bg-primary'} ${progress[p.id] === 'pending' ? 'w-0' : progress[p.id] === 'running' ? 'w-1/2 animate-pulse' : 'w-full'}`} /></div></div>)}</div>}

    {draft && <div className="glass mb-6 space-y-3 rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{draft.id ? 'Editar fuente' : 'Nueva fuente'}</h3><Button size="icon" variant="ghost" aria-label="Cerrar" onClick={() => { setDraft(null); setPreview(null) }}><X size={16} /></Button></div>
      <input className={input} placeholder="Nombre" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
      <input className={input} type="url" placeholder="https://mi-catalogo.com/feed.xml" value={draft.baseUrl} onChange={e => setDraft({ ...draft, baseUrl: e.target.value })} />
      {draft.baseUrl && errors?.url && <p className="text-xs text-destructive">{errors.url}</p>}
      <div className="grid grid-cols-4 gap-1 rounded-lg bg-card p-1">{(['rss', 'json', 'sitemap', 'html'] as const).map(t => <button key={t} type="button" onClick={() => setDraft({ ...draft, type: t })} className={`rounded-md py-1.5 text-xs uppercase ${draft.type === t ? 'bg-background font-semibold' : 'text-muted-foreground'}`}>{t}</button>)}</div>
      {CONFIG_FIELDS[draft.type].map(f => <label key={f.key} className="block text-xs text-muted-foreground">{f.label}{f.required ? ' *' : ''}<input className={`${input} mt-1`} placeholder={f.placeholder} value={draft.config[f.key] ?? ''} onChange={e => setCfg(f.key, e.target.value)} />{f.key === 'urlPattern' && errors?.urlPattern && <span className="text-destructive">{errors.urlPattern}</span>}</label>)}
      <label className="block text-xs text-muted-foreground">Patrón de episodio<input className={`${input} mt-1 font-mono`} placeholder="(?:episodio|ep|cap[ií]tulo)\s*(\d+)" value={draft.config.episodeRegex ?? ''} onChange={e => setCfg('episodeRegex', e.target.value)} />{errors?.episodeRegex && <span className="text-destructive">{errors.episodeRegex}</span>}</label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">Incluir URLs<input className={`${input} mt-1`} placeholder="/episodio/" value={draft.config.includePattern ?? ''} onChange={e => setCfg('includePattern', e.target.value)} />{errors?.includePattern && <span className="text-destructive">{errors.includePattern}</span>}</label>
        <label className="text-xs text-muted-foreground">Excluir URLs<input className={`${input} mt-1`} placeholder="/trailer/" value={draft.config.excludePattern ?? ''} onChange={e => setCfg('excludePattern', e.target.value)} />{errors?.excludePattern && <span className="text-destructive">{errors.excludePattern}</span>}</label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">Idioma por defecto<select className={`${input} mt-1`} value={draft.config.langDefault ?? 'sub'} onChange={e => setCfg('langDefault', e.target.value)}><option value="sub">Subtitulado</option><option value="dub">Doblado</option><option value="neutro">Neutro</option></select></label>
        <label className="text-xs text-muted-foreground">Intervalo (min)<input className={`${input} mt-1`} type="number" min={5} placeholder={`Global (${d.globalInterval})`} value={draft.scanIntervalMinutes ?? ''} onChange={e => setDraft({ ...draft, scanIntervalMinutes: e.target.value ? Number(e.target.value) : null })} /></label>
      </div>
      {errors?.fields && <p className="text-xs text-muted-foreground">{errors.fields}</p>}
      <div className="flex gap-2 pt-1"><Button variant="secondary" className="flex-1" disabled={invalid || !!busy} onClick={onTest}>{busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}Probar fuente</Button><Button className="flex-1" disabled={invalid || !!busy} onClick={onSave}>{busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}Guardar</Button></div>
      {preview && <div className="rounded-xl bg-card p-3 text-xs">{preview.errors.length ? <p className="text-destructive">{preview.errors[0]}</p> : <><p className="mb-2 font-medium">{preview.found} elementos encontrados · {preview.new} episodios válidos</p>{preview.preview?.map((p, i) => <p key={i} className="truncate text-muted-foreground">{p.title} Ep {p.episode} → {p.type} · {p.lang}</p>)}{!preview.preview?.length && <p className="text-muted-foreground">Ningún elemento produjo un episodio; revisa el patrón.</p>}</>}</div>}
    </div>}

    {!d.providers.length ? <div className="rounded-xl bg-card p-6 text-center"><p className="mb-1 text-sm font-medium">Sin fuentes todavía</p><p className="mb-4 text-xs text-muted-foreground">Registra tu catálogo y la app detectará episodios nuevos.</p><Button size="sm" onClick={() => setDraft(emptyDraft)}><Plus size={14} />Añadir fuente</Button></div>
      : <div className="divide-y divide-border border-y border-border">{d.providers.map(p => <div key={p.id} className="py-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${typeStyle[p.type]}`}>{p.type}</span>
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</p>
          {p.lastScanStatus === 'running' || progress[p.id] === 'running' ? <Loader2 size={14} className="animate-spin text-muted-foreground" /> : p.lastScanStatus === 'ok' ? <span className="h-2 w-2 rounded-full bg-primary" title="Correcto" /> : p.lastScanStatus === 'error' ? <span className="h-2 w-2 rounded-full bg-destructive" title={p.lastScanMessage ?? 'Error'} /> : null}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground" title={p.baseUrl}>{p.baseUrl}</p>
        <p className="mt-1 text-xs text-muted-foreground">{ago(p.lastScanAt)} · {p.lastScanNew} nuevos · {p.lastScanFound} encontrados</p>
        {p.lastScanStatus === 'error' && p.lastScanMessage && <p className="mt-1 text-xs text-destructive">{p.lastScanMessage}</p>}
        <div className="mt-2 flex gap-1">
          <Button size="icon" variant="ghost" aria-label={p.enabled ? 'Desactivar' : 'Activar'} title={p.enabled ? 'Desactivar' : 'Activar'} onClick={async () => { await toggle({ data: { id: p.id, enabled: !p.enabled } }); refresh() }}><Power size={16} className={p.enabled ? 'text-primary' : 'text-muted-foreground'} /></Button>
          <Button size="icon" variant="ghost" aria-label="Editar" title="Editar" onClick={() => { setDraft({ id: p.id, name: p.name, baseUrl: p.baseUrl, type: p.type, config: p.config, enabled: p.enabled, scanIntervalMinutes: p.scanIntervalMinutes }); setPreview(null) }}><Pencil size={16} /></Button>
          <Button size="icon" variant="ghost" aria-label="Escanear ahora" title="Escanear ahora" disabled={progress[p.id] === 'running'} onClick={async () => { await runScan(p); refresh() }}><Play size={16} /></Button>
          <Button size="icon" variant="ghost" aria-label="Eliminar" title="Eliminar" onClick={async () => { if (!window.confirm(`¿Eliminar "${p.name}" y sus episodios detectados?`)) return; try { await del({ data: p.id }); toast.success('Fuente eliminada'); refresh() } catch { toast.error('No se pudo eliminar') } }}><Trash2 size={16} /></Button>
        </div>
      </div>)}</div>}
  </>
}

function Discovered() {
  const client = useQueryClient()
  const list = useServerFn(listDiscovered), del = useServerFn(deleteDiscovered), seen = useServerFn(markDiscoveredSeen), sources = useServerFn(listSources)
  const q = useQuery({ queryKey: ['discovered'], queryFn: () => list(), retry: false })
  const s = useQuery({ queryKey: ['sources'], queryFn: () => sources(), retry: false })
  const [provider, setProvider] = useState(''), [anime, setAnime] = useState(''), [state, setState] = useState<'all' | 'new' | 'seen'>('all'), [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const names = useMemo(() => new Map((s.data?.providers ?? []).map(p => [p.id, p.name])), [s.data])
  const titles = useMemo(() => [...new Set((q.data ?? []).map(e => e.anime_title))].sort(), [q.data])
  const rows = (q.data ?? []).filter(e => (!provider || e.provider_id === provider) && (!anime || e.anime_title === anime) && (state === 'all' || (state === 'new') === e.is_new) && (!search || `${e.anime_title} ${e.url}`.toLowerCase().includes(search.toLowerCase())))
  const bulk = async (kind: 'delete' | 'seen') => { const ids = [...selected]; if (!ids.length) return; if (kind === 'delete' && !window.confirm(`¿Eliminar ${ids.length} episodios?`)) return; try { await (kind === 'delete' ? del({ data: ids }) : seen({ data: ids })); toast.success(kind === 'delete' ? 'Episodios eliminados' : 'Marcados como vistos'); setSelected(new Set()); client.invalidateQueries({ queryKey: ['discovered'] }) } catch { toast.error('No se pudo completar') } }
  if (q.isLoading) return <Skeleton />
  if (q.isError) return <div className="rounded-xl bg-card p-5 text-center text-sm"><p className="mb-3 text-destructive">No se pudieron cargar los episodios</p><Button size="sm" variant="secondary" onClick={() => q.refetch()}><RefreshCw size={14} />Reintentar</Button></div>
  return <>
    <div className="mb-3 space-y-2">
      <input className={input} placeholder="Buscar" value={search} onChange={e => setSearch(e.target.value)} />
      <div className="grid grid-cols-3 gap-2">
        <select className={input} value={provider} onChange={e => setProvider(e.target.value)}><option value="">Fuentes</option>{[...names].map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
        <input className={input} list="disc-anime" placeholder="Anime" value={anime} onChange={e => setAnime(e.target.value)} /><datalist id="disc-anime">{titles.map(t => <option key={t} value={t} />)}</datalist>
        <select className={input} value={state} onChange={e => setState(e.target.value as typeof state)}><option value="all">Todos</option><option value="new">Nuevos</option><option value="seen">Vistos</option></select>
      </div>
      {selected.size > 0 && <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => bulk('seen')}><Check size={14} />Marcar vistos ({selected.size})</Button><Button size="sm" variant="destructive" onClick={() => bulk('delete')}><Trash2 size={14} />Eliminar</Button></div>}
    </div>
    {!rows.length ? <p className="py-8 text-center text-sm text-muted-foreground">Sin episodios detectados</p> : <div className="divide-y divide-border border-y border-border">
      <label className="flex items-center gap-2 py-2 text-xs text-muted-foreground"><input type="checkbox" checked={selected.size === rows.length} onChange={e => setSelected(e.target.checked ? new Set(rows.map(r => r.id)) : new Set())} />Seleccionar todo ({rows.length})</label>
      {rows.map(e => <div key={e.id} className="flex items-center gap-2 py-2.5">
        <input type="checkbox" checked={selected.has(e.id)} onChange={ev => setSelected(prev => { const n = new Set(prev); ev.target.checked ? n.add(e.id) : n.delete(e.id); return n })} />
        <div className="min-w-0 flex-1"><p className="truncate text-sm">{e.anime_title} · Ep {e.episode}{e.is_new && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">Nuevo</span>}</p><p className="truncate text-xs text-muted-foreground">{names.get(e.provider_id) ?? 'Fuente'} · {e.type} · {e.lang} · {e.video_anime_id ? 'vinculado' : 'sin vincular'} · {ago(e.detected_at)}</p></div>
        <Button size="icon" variant="ghost" aria-label="Eliminar episodio" onClick={async () => { if (!window.confirm('¿Eliminar este episodio?')) return; await del({ data: [e.id] }); client.invalidateQueries({ queryKey: ['discovered'] }) }}><Trash2 size={15} /></Button>
      </div>)}
    </div>}
  </>
}
