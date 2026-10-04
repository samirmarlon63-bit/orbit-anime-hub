import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { getSaved } from '@/lib/orbit.functions'
import { Shell, Empty } from '@/components/orbit-shell'
import { AnimeRow, type Anime } from '@/components/anime-row'
import { Button } from '@/components/ui/button'
export const Route = createFileRoute('/guardados')({head:()=>({meta:[{title:'Colección — Anime Orbit'},{name:'description',content:'Tu colección personal de anime guardado.'},{property:'og:title',content:'Colección — Anime Orbit'},{property:'og:description',content:'Tu colección personal de anime.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Saved})
function Saved(){
 const [user,setUser]=useState(false)
 const fetchSaved=useServerFn(getSaved)
 useEffect(()=>{supabase.auth.getUser().then(({data})=>setUser(Boolean(data.user)));const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUser(Boolean(session?.user)));return ()=>subscription.unsubscribe()},[])
 const {data,isPending,error}=useQuery({queryKey:['saved',user],queryFn:()=>fetchSaved(),enabled:user,retry:1})
 const saved=(data??[]).map(row=>row.animes as Anime | null).filter((anime):anime is Anime=>Boolean(anime))
 return <Shell title="Colección">{!user?<div className="flex min-h-[55vh] flex-col items-center justify-center"><Empty title="Tu colección te espera" detail="Inicia sesión para guardar tus animes favoritos."/><Button asChild className="-mt-20"><Link to="/auth">Iniciar sesión</Link></Button></div>:isPending?<p className="py-20 text-center text-sm text-muted-foreground">Cargando colección…</p>:error?<Empty title="No pudimos cargar tu colección" detail="Inténtalo de nuevo más tarde."/>:saved.length?<div>{saved.map(anime=><AnimeRow key={anime.id} anime={anime} initialSaved/>)}</div>:<Empty title="Tu colección está vacía" detail="Guarda animes desde Inicio para encontrarlos aquí."/>}</Shell>
}
