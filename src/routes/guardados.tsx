import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { getHome, getSaved, getVideos } from '@/lib/orbit.functions'
import { Shell, Empty } from '@/components/orbit-shell'
import { AnimeRow, type Anime } from '@/components/anime-row'
import { readLocalCollection, readLocalVideos } from '@/lib/local-collection'
import { VideoSaveButton } from '@/components/video-save-button'
import { Link } from '@tanstack/react-router'
export const Route = createFileRoute('/guardados')({head:()=>({meta:[{title:'Colección — Anime Orbit'},{name:'description',content:'Tu colección personal de anime guardado.'},{property:'og:title',content:'Colección — Anime Orbit'},{property:'og:description',content:'Tu colección personal de anime.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Saved})
function Saved(){
 const [user,setUser]=useState<boolean | null>(null)
 const [localIds,setLocalIds]=useState<string[]>([])
 const [videoIds,setVideoIds]=useState<string[]>([])
 const fetchSaved=useServerFn(getSaved)
 useEffect(()=>{let mounted=true;const refresh=()=>{setLocalIds(readLocalCollection());setVideoIds(readLocalVideos())};refresh();window.addEventListener('orbit-collection-change',refresh);supabase.auth.getUser().then(({data})=>{if(mounted)setUser(Boolean(data.user))});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUser(Boolean(session?.user)));return ()=>{mounted=false;subscription.unsubscribe();window.removeEventListener('orbit-collection-change',refresh)}},[])
 const {data,isPending,error}=useQuery({queryKey:['saved',user],queryFn:()=>fetchSaved(),enabled:user===true,retry:1})
 const home=useQuery({queryKey:['home'],queryFn:()=>getHome(),enabled:user===false})
 const videos=useQuery({queryKey:['videos'],queryFn:()=>getVideos(),enabled:videoIds.length>0})
 const saved=user ? (data??[]).map(row=>row.animes as Anime | null).filter((anime):anime is Anime=>Boolean(anime)) : localIds.map(id=>(home.data?.animes as Anime[] | undefined)?.find(anime=>anime.id===id)).filter((anime):anime is Anime=>Boolean(anime))
 const videoSaved=videoIds.map(id=>videos.data?.find(video=>video.id===id)).filter((video):video is NonNullable<typeof video>=>Boolean(video))
 return <Shell title="Colección">{user===null || (user ? isPending : home.isPending) || videos.isPending && videoIds.length>0?<p className="py-20 text-center text-sm text-muted-foreground">Cargando colección…</p>:user && error || !user && home.error ?<Empty title="No pudimos cargar tu colección" detail="Inténtalo de nuevo más tarde."/>:saved.length || videoSaved.length?<><div>{videoSaved.map(video=><div key={video.id} className="flex items-center gap-4 border-t border-border py-4"><Link to="/videos/$id" params={{id:video.id}} className="flex min-w-0 flex-1 items-center gap-4"><div className="aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-md bg-card">{video.cover_url&&<img src={video.cover_url} alt="" onError={e=>{e.currentTarget.style.display='none'}} className="h-full w-full object-cover"/>}</div><div className="min-w-0"><h2 className="line-clamp-2 text-sm font-semibold">{video.title}</h2><p className="mt-1 text-xs text-muted-foreground">{video.video_episodes?.length??0} episodios</p></div></Link><VideoSaveButton id={video.id}/></div>)}</div><div>{saved.map(anime=><AnimeRow key={anime.id} anime={anime} initialSaved/>)}</div></>:<Empty title="Tu colección está vacía" detail="Guarda animes desde Inicio o Buscar para encontrarlos aquí."/>}</Shell>
}
