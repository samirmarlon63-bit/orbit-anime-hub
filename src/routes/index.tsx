import { createFileRoute, Link } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useQuery } from '@tanstack/react-query'
import { getHome, getVideos } from '@/lib/orbit.functions'
import { Shell, Empty } from '@/components/orbit-shell'
import { AnimeRow, type Anime } from '@/components/anime-row'
import { ArrowRight, Play } from 'lucide-react'
const options=queryOptions({queryKey:['home'],queryFn:()=>getHome(),staleTime:300000})
export const Route=createFileRoute('/')({head:()=>({meta:[{title:'Inicio — Anime Orbit'},{name:'description',content:'Descubre estrenos y capítulos de anime en Anime Orbit.'},{property:'og:title',content:'Inicio — Anime Orbit'},{property:'og:description',content:'Descubre estrenos y capítulos de anime.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),loader:({context})=>context.queryClient.ensureQueryData(options),component:Home,errorComponent:()=> <Shell title="Inicio"><Empty title="No pudimos cargar los estrenos" detail="Vuelve a intentarlo en un momento."/></Shell>})
function Home(){
 const {data}=useSuspenseQuery(options)
 const {data:videos=[]}=useQuery({queryKey:['videos'],queryFn:()=>getVideos(),staleTime:300000})
 const upcoming=(data.animes as Anime[]).filter(a=>!a.release_at || new Date(a.release_at).getTime()>=Date.now()-86400000)
 const featured=videos[0]
 return <Shell title="Inicio">
   {featured && <Link to="/videos/$id" params={{id:featured.id}} className="relative mb-9 block aspect-[16/9] overflow-hidden rounded-lg border border-border bg-card sm:aspect-[21/9]" aria-label={`Ver ${featured.title}`}>
     {featured.cover_url && <img src={featured.cover_url} alt="" onLoad={e=>{e.currentTarget.style.opacity="1"}} onError={e=>{e.currentTarget.style.opacity="0"}} className="absolute inset-0 h-full w-full object-cover object-center opacity-0"/>}
     <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"/>
     <div className="absolute bottom-5 left-5 right-5 sm:bottom-8 sm:left-8"><span className="mb-2 block text-xs font-medium text-foreground/80">AHORA EN VIDEOS</span><h2 className="line-clamp-2 max-w-xl text-2xl font-bold text-foreground sm:text-4xl">{featured.title}</h2><span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-foreground"><Play size={16} fill="currentColor"/>Ver capítulos</span></div>
   </Link>}
   {videos.length > 0 && <section className="mb-10"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Para ver ahora</h2><Link to="/videos" className="inline-flex items-center gap-1 text-sm text-muted-foreground">Ver todo <ArrowRight size={15}/></Link></div><div className="hide-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto px-5 sm:mx-0 sm:px-0">{videos.slice(0,8).map(v=><Link key={v.id} to="/videos/$id" params={{id:v.id}} className="w-[30%] min-w-[105px] max-w-[160px] shrink-0 snap-start sm:w-[17%]"><div className="aspect-[2/3] overflow-hidden rounded-lg border border-border bg-card">{v.cover_url&&<img src={v.cover_url} alt="" loading="lazy" onLoad={e=>{e.currentTarget.style.opacity="1"}} onError={e=>{e.currentTarget.style.opacity="0"}} className="h-full w-full object-cover opacity-0"/>}</div><p className="mt-2 line-clamp-2 text-xs font-medium leading-5">{v.title}</p></Link>)}</div></section>}
   <section><div className="mb-4 flex items-baseline justify-between"><h2 className="text-lg font-bold">Próximos estrenos</h2><span className="text-xs text-muted-foreground">{upcoming.length} títulos</span></div>{upcoming.length?upcoming.map(a=><AnimeRow key={a.id} anime={a}/>):<Empty title="Todavía no hay estrenos" detail="Los próximos estrenos aparecerán aquí cuando se confirmen."/>}</section>
 </Shell>
}
