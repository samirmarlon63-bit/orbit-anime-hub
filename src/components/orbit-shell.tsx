import { Link, useRouterState } from '@tanstack/react-router'
import { Compass, Bookmark, Settings2, Orbit, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ReactNode } from 'react'
export function Shell({ children, title, subtitle, back }: { children?: ReactNode; title: string; subtitle?: string; back?: string }) {
  const path = useRouterState({ select: s => s.location.pathname })
  const tabs = [{to:'/',icon:Compass,label:'Nuevos'}, {to:'/guardados',icon:Bookmark,label:'Guardados'}, {to:'/configuracion',icon:Settings2,label:'Configuración'}] as const
  return <div className="min-h-dvh bg-background pb-36"><div className="mx-auto max-w-5xl px-5 pt-[max(38px,env(safe-area-inset-top))] sm:px-8">
    <header className="mb-9 flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-primary"><Orbit size={19}/></span><span className="text-[13px] font-semibold uppercase tracking-[0.17em]">ANIME <span className="text-primary">ORBIT</span></span></div><span className="size-2 rounded-full bg-primary/65 shadow-[0_0_15px_var(--primary)]"/></header>
    {back && <Button asChild variant="ghost" size="icon" className="mb-5 -ml-2 text-muted-foreground"><Link to={back}><ArrowLeft/></Link></Button>}
    <div className="mb-8"><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">EXPLORA EL UNIVERSO ANIME</p><h1 className="text-[38px] leading-tight font-semibold text-foreground sm:text-5xl">{title}</h1>{subtitle && <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>}</div>
    {children}</div><nav className="glass fixed inset-x-0 bottom-0 z-40 mx-auto flex h-[calc(72px+env(safe-area-inset-bottom))] max-w-md items-start justify-around border-t border-border/70 px-3 pt-2.5 shadow-2xl sm:bottom-5 sm:h-18 sm:rounded-[24px] sm:border sm:px-4 sm:shadow-xl">{tabs.map(({to,icon:Icon,label}) => <Link key={to} to={to} className={`flex min-w-20 flex-col items-center gap-1 rounded-xl px-2 py-1 transition-colors ${path===to ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}><Icon size={21} strokeWidth={path===to?2:1.7}/><span className="text-[10px] font-medium">{label}</span></Link>)}</nav></div>
}
export function Empty({ title, detail }: {title:string;detail:string}) { return <div className="border-t border-border py-16 text-center"><Orbit className="mx-auto mb-5 text-primary/70" size={33} strokeWidth={1.2}/><h2 className="text-lg font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{detail}</p></div> }
