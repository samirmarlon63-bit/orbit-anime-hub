import { Link, useRouterState } from '@tanstack/react-router'
import { Compass, Bookmark, Clapperboard, Settings2, Orbit, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ReactNode } from 'react'

export function Shell({ children, title, subtitle, back }: { children?: ReactNode; title: string; subtitle?: string; back?: string }) {
  const path = useRouterState({ select: s => s.location.pathname })
  const tabs = [
    { to: '/', icon: Compass, label: 'Nuevos' },
    { to: '/videos', icon: Clapperboard, label: 'Videos' },
    { to: '/guardados', icon: Bookmark, label: 'Guardados' },
    { to: '/configuracion', icon: Settings2, label: 'Configuración' },
  ] as const

  return (
    <div className="min-h-dvh bg-background pb-36">
      <div className="mx-auto max-w-5xl px-5 pt-[max(38px,env(safe-area-inset-top))] sm:px-8">
        <header className="mb-9 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full border border-primary/10 bg-primary/5 text-primary">
              <Orbit size={18} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Anime Orbit</p>
              <p className="text-xs text-muted-foreground">Tu universo anime</p>
            </div>
          </div>

          {back && (
            <Button asChild variant="ghost" size="icon" className="mb-5 -ml-2 text-muted-foreground">
              <Link to={back}><ArrowLeft /></Link>
            </Button>
          )}
        </header>

        <div className="mb-8">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">EXPLORA EL UNIVERSO ANIME</p>
          <h1 className="text-[38px] leading-tight font-semibold tracking-[-0.04em] text-foreground">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        {children}
      </div>

      <nav className="glass fixed inset-x-0 bottom-0 z-40 mx-auto flex h-[calc(72px+env(safe-area-inset-bottom))] max-w-md items-start justify-around border-t border-border/70 px-3 py-2">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = path === to
          return (
            <Link key={to} to={to} className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border-t border-border py-16 text-center">
      <Orbit className="mx-auto mb-5 text-primary/70" size={33} />
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  )
}
