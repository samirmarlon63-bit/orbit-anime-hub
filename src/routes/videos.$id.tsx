import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ExternalLink, Loader2, Play, List, LayoutGrid } from 'lucide-react'
import { getVideo, getPlayers } from '@/lib/orbit.functions'
import { Shell, Empty } from '@/components/orbit-shell'
import { Button } from '@/components/ui/button'
import { VideoPlayer } from '@/components/video-player'
export const Route = createFileRoute('/videos/$id')({ head: () => ({ meta: [{ title: 'Ver anime — Anime Orbit' }, { name: 'description', content: 'Mira capítulos y elige un servidor de reproducción en Anime Orbit.' }, { property: 'og:title', content: 'Ver anime — Anime Orbit' }, { property: 'og:description', content: 'Capítulos y servidores de anime.' }, { property: 'og:type', content: 'video.other' }, { name: 'twitter:card', content: 'summary_large_image' }] }), component: Detail })

const LANG = { sub: 'Sub Español', latino: 'Audio Latino' } as const

function Detail() {
  const { id } = Route.useParams()
  const { data: anime, isLoading } = useQuery({ queryKey: ['video', id], queryFn: () => getVideo({ data: id }) })
  const [episodeId, setEpisodeId] = useState<string | null>(null)
  const [choice, setChoice] = useState<string | null>(null)
  const [lang, setLang] = useState<'sub' | 'latino' | null>(null)
  const [layout, setLayout] = useState<'list' | 'grid'>('list')
  const episodes = [...(anime?.video_episodes ?? [])].sort((a, b) => Number(a.number) - Number(b.number))
  const active = episodes.find(e => e.id === episodeId) ?? episodes[0]
  const { data: players, isFetching } = useQuery({ queryKey: ['players', active?.id], queryFn: () => getPlayers({ data: active!.id }), enabled: !!active, staleTime: 5 * 60_000 })
  if (isLoading) return <Shell title="Cargando" back="/videos" />
  if (!anime) return <Shell title="No encontrado" back="/videos"><Empty title="Este anime no está disponible" detail="Explora otros títulos en Videos." /></Shell>
  const options = players?.options ?? []
  const langs = (['sub', 'latino'] as const).filter(l => options.some(o => o.lang === l))
  const curLang = lang && langs.includes(lang as never) ? lang : langs[0] ?? null
  const visible = langs.length ? options.filter(o => o.lang === curLang || o.lang === null) : options
  const source = visible.find(o => o.url === choice) ?? visible[0]
  return <Shell title={anime.title} subtitle={`${anime.status === 'airing' ? 'En emisión' : 'Finalizado'} · ${episodes.length} episodios`} back="/videos">
    <div className="relative -mx-5 -mt-5 mb-6 aspect-[16/9] overflow-hidden bg-card sm:mx-0 sm:rounded-lg">
      {anime.cover_url && <img src={anime.cover_url} alt={`Portada de ${anime.title}`} className="h-full w-full object-cover object-center" />}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent px-5 pb-5 pt-16"><p className="text-xs font-semibold uppercase text-foreground/80">{anime.status === 'airing' ? 'En emisión' : 'Finalizado'}</p><h2 className="mt-1 line-clamp-2 text-2xl font-bold text-foreground">{anime.title}</h2></div>
    </div>
    <p className="mb-6 line-clamp-3 text-sm leading-6 text-muted-foreground">{anime.synopsis || 'Sinopsis por confirmar'}</p>
    <div className="sticky top-0 z-20 -mx-5 mb-6 bg-background/90 px-5 py-2 backdrop-blur-xl sm:static sm:mx-0 sm:px-0">
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md bg-card">
        {isFetching && !source ? <Loader2 size={26} className="animate-spin text-muted-foreground" />
          : source ? <VideoPlayer url={source.url} kind={source.kind} title={`${anime.title} — capítulo ${active?.number}`} />
          : players?.external ? <a href={players.external} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 px-6 text-center text-sm text-primary"><ExternalLink size={18} />Ver en la página original{players.error && <span className="text-xs text-muted-foreground">{players.error}</span>}</a>
          : <div className="text-center text-muted-foreground"><Play size={30} className="mx-auto mb-3" strokeWidth={1.3} /><p className="text-sm">Selecciona un capítulo disponible</p></div>}
      </div>
    </div>
    {active && <>
      <p className="mb-3 text-sm font-semibold">Episodio {active.number}{active.title && !/^(?:primer\s+episodio|episodio\s*\d+|cap[ií]tulo\s*\d+)$/i.test(active.title.trim()) ? ` · ${active.title}` : ''}</p>
      {langs.length > 1 && <div className="hide-scrollbar mb-3 flex gap-2 overflow-x-auto">{langs.map(l => <Button key={l} size="sm" variant={curLang === l ? 'default' : 'secondary'} className="shrink-0 rounded-full" onClick={() => { setLang(l); setChoice(null) }}>{LANG[l]}</Button>)}</div>}
      <div className="hide-scrollbar mb-8 flex gap-2 overflow-x-auto">{visible.map((s, i) => <Button key={s.url} size="sm" variant={source?.url === s.url ? 'default' : 'secondary'} className="shrink-0 rounded-full" onClick={() => setChoice(s.url)}>{s.label || `Servidor ${i + 1}`}{langs.length === 1 && s.lang ? ` · ${LANG[s.lang]}` : ''}</Button>)}</div>
    </>}
    <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Episodios</h2><div className="flex items-center gap-1"><Button type="button" variant="ghost" size="icon" title="Vista de lista" aria-label="Vista de lista" aria-pressed={layout === 'list'} onClick={() => setLayout('list')} className={layout === 'list' ? 'text-foreground' : 'text-muted-foreground'}><List size={20}/></Button><Button type="button" variant="ghost" size="icon" title="Vista de cuadrícula" aria-label="Vista de cuadrícula" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')} className={layout === 'grid' ? 'text-foreground' : 'text-muted-foreground'}><LayoutGrid size={20}/></Button></div></div>
    <p className="mb-4 text-xs text-muted-foreground">{episodes.length} episodios · Del primero al último</p>
    <div className={layout === 'grid' ? 'grid grid-cols-2 gap-3 sm:grid-cols-3' : 'divide-y divide-border border-y border-border'}>{episodes.map((ep, i) => <Button key={ep.id} variant="ghost" className={`${layout === 'grid' ? 'h-auto flex-col items-start rounded-md border border-border bg-card p-3' : 'h-auto min-h-20 w-full justify-start rounded-none px-1 py-3'} min-w-0 gap-3 text-left ${active?.id === ep.id ? 'text-primary' : 'text-foreground'}`} onClick={() => { setEpisodeId(ep.id); setChoice(null) }}><span className={`${layout === 'grid' ? 'w-full' : 'w-24 sm:w-32'} relative flex aspect-video shrink-0 items-center justify-center overflow-hidden rounded-md bg-card`}>{anime.cover_url && <img src={anime.cover_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-50"/>}<Play size={20} className="relative text-foreground" fill="currentColor" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">Episodio {ep.number}</span>{ep.title && !/^(?:primer\s+episodio|episodio\s*\d+|cap[ií]tulo\s*\d+)$/i.test(ep.title.trim()) && <span className="mt-1 block truncate text-xs text-muted-foreground">{ep.title}</span>}</span>{i === episodes.length - 1 && episodes.length > 1 && <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">Nuevo</span>}</Button>)}</div>
  </Shell>
}
