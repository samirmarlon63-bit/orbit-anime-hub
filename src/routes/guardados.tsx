import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { getSaved } from '@/lib/orbit.functions'
import { Shell, Empty } from '@/components/orbit-shell'
import { AnimeRow, type Anime } from '@/components/anime-row'

export const Route = createFileRoute('/guardados')({
  head: () => ({
    meta: [
      { title: 'Guardados — Anime Orbit' },
      { name: 'description', content: 'Tus animes guardados en Anime Orbit.' },
      { property: 'og:title', content: 'Guardados — Anime Orbit' },
      { property: 'og:description', content: 'Accede a tu colección personal de anime.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Saved,
})

function Saved() {
  const [user, setUser] = useState(false)
  const fetchSaved = useServerFn(getSaved)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(Boolean(data.user)))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(Boolean(session?.user))
    })
    return () => subscription.unsubscribe()
  }, [])

  const { data, isPending, error } = useQuery({
    queryKey: ['saved', user],
    queryFn: () => fetchSaved(),
    enabled: user,
    retry: 1,
  })

  if (!user) {
    return (
      <Shell title="Guardados" subtitle="Tu colección de anime">
        <Empty
          title="Sin contenido guardado"
          detail="Guarda tus animes favoritos para encontrarlos aquí."
        />
      </Shell>
    )
  }

  if (isPending) {
    return (
      <Shell title="Guardados" subtitle="Tu colección de anime">
        <div className="border-t border-border py-12 text-center">
          <div className="inline-flex h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Cargando guardados...</p>
        </div>
      </Shell>
    )
  }

  if (error) {
    return (
      <Shell title="Guardados" subtitle="Tu colección de anime">
        <Empty
          title="Error al cargar"
          detail="No pudimos obtener tus guardados. Intenta más tarde."
        />
      </Shell>
    )
  }

  const saved = data as unknown as Anime[] | undefined
  if (!saved || saved.length === 0) {
    return (
      <Shell title="Guardados" subtitle="Tu colección de anime">
        <Empty
          title="Sin contenido guardado"
          detail="Guarda tus animes favoritos para encontrarlos aquí."
        />
      </Shell>
    )
  }

  return (
    <Shell title="Guardados" subtitle="Tu colección de anime">
      <div className="border-t border-border">
        {saved.map((anime) => (
          <AnimeRow key={anime.id} anime={anime} />
        ))}
      </div>
    </Shell>
  )
}
