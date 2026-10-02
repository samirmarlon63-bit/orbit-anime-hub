import { Link, useRouterState } from '@tanstack/react-router'
import { Compass, Bookmark, Settings2, Orbit, ArrowLeft, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ReactNode } from 'react'

export function Shell({ children, title, subtitle, back }: { children?: ReactNode; title: string; subtitle?: string; back?: string }) {
  const path = useRouterState({ select: s => s.location.pathname })
  const tabs = [
    { to: '/', icon: Compass, label: 'Nuevos' },
    { to: '/videos', icon: Video, label: 'Videos' },
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

      <nav className="glass fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-40 mx-auto flex h-[66px] max-w-md items-center rounded-[26px] border border-border/50 px-2 shadow-[var(--shadow-float)]">
        {tabs.map(({ to, icon: Icon, label }, i) => {
          const isActive = path === to || (to !== '/' && path.startsWith(to))
          return (
            <Link
              key={to}
              to={to}
              className="group relative z-10 flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-[20px] px-1 text-muted-foreground transition-all duration-300 ease-out active:scale-95 active:bg-foreground/5"
              {...(isActive ? { 'data-active': true } : {})}
            >
              <span className={`flex h-6 items-center transition-transform duration-300 ease-out ${isActive ? 'scale-105 text-primary' : 'group-active:scale-95'}`}>
                <Icon size={19} strokeWidth={isActive ? 2.3 : 2} className="transition-colors duration-300" />
              </span>
              <span className={`whitespace-nowrap text-[10px] leading-none tracking-tight transition-colors duration-300 ${isActive ? 'font-semibold text-primary' : 'font-medium'}`}>
                {label}
              </span>
              {isActive && (
                <span aria-hidden className="pointer-events-none absolute inset-x-2 top-1/2 -z-10 h-12 -translate-y-1/2 rounded-[20px] bg-primary/10 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" />
              )}
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
