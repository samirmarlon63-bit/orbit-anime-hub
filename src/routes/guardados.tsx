import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useEffect,useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { getSaved } from '@/lib/orbit.functions'
import { Shell,Empty } from '@/components/orbit-shell'
import { AnimeRow,type Anime } from '@/components/anime-row'
import { Button } from '@/components/ui/button'
export const Route=createFileRoute('/guardados')({head:()=>({meta:[{title:'Guardados — Anime Orbit'},{name:'description',content:'Tus animes guardados en Anime Orbit.'},{property:'og:title',content:'Guardados — Anime Orbit'},{property:'og:description',content:'Tu colección personal de animes.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Saved})
function Saved(){const [user,setUser]=useState(false);const fetchSaved=useServerFn(getSaved);useEffect(()=>{supabase.auth.getUser().then(({data})=>setUser(Boolean(data.user)));const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setUser(Boolean(s?.user)));return()=>subscription.unsubscribe()},[]);const q=useQuery({queryKey:['saved',user],queryFn:()=>fetchSaved(),enabled:user});return <Shell title="Guardados" subtitle="Tus historias, siempre a mano.">{!user?<div className="text-center"><Empty title="Tu colección te espera" detail="Inicia sesión para guardar tus animes favoritos y encontrarlos aquí."/><Button asChild className="rounded-full"><Link to="/auth">Iniciar sesión</Link></Button></div>:q.isLoading?<p className="text-sm text-muted-foreground">Cargando colección…</p>:q.data?.length?q.data.map(item=>item.animes&&<AnimeRow key={item.anime_id} anime={item.animes as Anime} initialSaved/>):<Empty title="Aún no has guardado nada" detail="Toca el marcador junto a cualquier anime de Nuevos para añadirlo a tu colección."/>}</Shell>}
