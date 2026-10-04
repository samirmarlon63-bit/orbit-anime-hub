import { Link, useRouterState } from '@tanstack/react-router'
import { House, Search, LibraryBig, Settings, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ReactNode } from 'react'

export function Shell({ children, title, subtitle, back }: { children?: ReactNode; title: string; subtitle?: string; back?: string }) {
  const path = useRouterState({ select: s => s.location.pathname })
  const tabs = [
    { to: '/', icon: House, label: 'Inicio' },
    { to: '/videos', icon: Search, label: 'Buscar' },
    { to: '/guardados', icon: LibraryBig, label: 'Colección' },
    { to: '/configuracion', icon: Settings, label: 'Ajustes' },
  ] as const
  return <div className="min-h-dvh bg-background pb-28">
    <div className="mx-auto w-full max-w-5xl px-5 pt-[max(38px,env(safe-area-inset-top))] sm:px-8 sm:pt-12">
      {back && <Button asChild variant="ghost" size="icon" className="mb-5 -ml-2 text-muted-foreground" aria-label="Volver"><Link to={back}><ArrowLeft /></Link></Button>}
      <header className="mb-8 sm:mb-10"><h1 className="text-[36px] font-bold leading-tight text-foreground sm:text-[42px]">{title}</h1>{subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}</header>
      {children}
    </div>
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-nav/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto grid h-[72px] max-w-5xl grid-cols-4 items-center px-3 sm:px-8">
        {tabs.map(({to, icon: Icon, label}) => { const active = path === to || (to !== '/' && path.startsWith(to)); return <Link key={to} to={to} aria-current={active ? 'page' : undefined} className={`flex h-full min-w-0 flex-col items-center justify-center gap-1 transition-colors duration-200 ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><Icon size={25} strokeWidth={active ? 2.2 : 1.9}/><span className="text-[11px] font-medium">{label}</span></Link> })}
      </div>
    </nav>
  </div>
}

export function Empty({ title, detail, icon: Icon = LibraryBig }: { title: string; detail: string; icon?: typeof LibraryBig }) {
  return <div className="flex min-h-[48vh] flex-col items-center justify-center px-5 text-center"><Icon size={56} strokeWidth={1.5} className="mb-5 text-muted-foreground"/><h2 className="text-lg font-medium text-foreground">{title}</h2><p className="mt-2 max-w-sm text-sm text-muted-foreground">{detail}</p></div>
}
