import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { getHome, getSaved } from '@/lib/orbit.functions'
import { Shell, Empty } from '@/components/orbit-shell'
import { AnimeRow, type Anime } from '@/components/anime-row'
import { readLocalCollection } from '@/lib/local-collection'
export const Route = createFileRoute('/guardados')({head:()=>({meta:[{title:'Colección — Anime Orbit'},{name:'description',content:'Tu colección personal de anime guardado.'},{property:'og:title',content:'Colección — Anime Orbit'},{property:'og:description',content:'Tu colección personal de anime.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Saved})
function Saved(){
 const [user,setUser]=useState<boolean | null>(null)
 const [localIds,setLocalIds]=useState<string[]>([])
 const fetchSaved=useServerFn(getSaved)
 useEffect(()=>{let mounted=true;const refresh=()=>setLocalIds(readLocalCollection());refresh();window.addEventListener('orbit-collection-change',refresh);supabase.auth.getUser().then(({data})=>{if(mounted)setUser(Boolean(data.user))});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUser(Boolean(session?.user)));return ()=>{mounted=false;subscription.unsubscribe();window.removeEventListener('orbit-collection-change',refresh)}},[])
 const {data,isPending,error}=useQuery({queryKey:['saved',user],queryFn:()=>fetchSaved(),enabled:user===true,retry:1})
 const home=useQuery({queryKey:['home'],queryFn:()=>getHome(),enabled:user===false})
 const saved=user ? (data??[]).map(row=>row.animes as Anime | null).filter((anime):anime is Anime=>Boolean(anime)) : localIds.map(id=>(home.data?.animes as Anime[] | undefined)?.find(anime=>anime.id===id)).filter((anime):anime is Anime=>Boolean(anime))
 return <Shell title="Colección">{user===null || (user ? isPending : home.isPending)?<p className="py-20 text-center text-sm text-muted-foreground">Cargando colección…</p>:user ? error?<Empty title="No pudimos cargar tu colección" detail="Inténtalo de nuevo más tarde."/>:saved.length?<div>{saved.map(anime=><AnimeRow key={anime.id} anime={anime} initialSaved/>)}</div>:<Empty title="Tu colección está vacía" detail="Guarda animes desde Inicio para encontrarlos aquí."/> : home.error?<Empty title="No pudimos cargar tu colección" detail="Inténtalo de nuevo más tarde."/>:saved.length?<div>{saved.map(anime=><AnimeRow key={anime.id} anime={anime} initialSaved/>)}</div>:<Empty title="Tu colección está vacía" detail="Guarda animes desde Inicio para encontrarlos aquí."/>}</Shell>
}
