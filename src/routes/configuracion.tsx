import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { getHome, getProfile, saveProfile } from '@/lib/orbit.functions'
import { Shell } from '@/components/orbit-shell'
import { Button } from '@/components/ui/button'
import { LogOut, Moon, Sun, Monitor, HardDrive, Instagram, ChevronRight, BadgeCheck } from 'lucide-react'
import developerProfile from '@/assets/developer-profile.jpeg.asset.json'
import { toast } from 'sonner'

type Theme = 'light' | 'dark' | 'auto'
type Playback = { autoplay: boolean; continue_playback: boolean; preferred_quality: string }
type Notifications = { enabled: boolean; new_anime: boolean; new_episode: boolean }

const STORAGE_KEY = 'anime-orbit-settings'
const DEFAULT_PLAYBACK: Playback = { autoplay: false, continue_playback: true, preferred_quality: '720p' }
const DEFAULT_NOTIFICATIONS: Notifications = { enabled: true, new_anime: true, new_episode: true }
const APP_VERSION = import.meta.env['VITE_APP_VERSION'] || '1.0.0'

export const Route = createFileRoute('/configuracion')({
  head: () => ({ meta: [
    { title: 'Configuración — Anime Orbit' },
    { name: 'description', content: 'Personaliza tu experiencia en Anime Orbit.' },
    { property: 'og:title', content: 'Configuración — Anime Orbit' },
    { property: 'og:description', content: 'Personaliza reproducción, notificaciones y apariencia.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Settings,
})

function readLocalSettings() {
  try {
    if (typeof window === 'undefined') return { theme: 'dark' as Theme, language: 'es', playback: DEFAULT_PLAYBACK, notifications: DEFAULT_NOTIFICATIONS }
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<{
      theme: Theme; language: string; playback: Playback; notifications: Notifications
    }>
    return {
      theme: saved.theme || 'dark',
      language: saved.language || 'es',
      playback: { ...DEFAULT_PLAYBACK, ...saved.playback },
      notifications: { ...DEFAULT_NOTIFICATIONS, ...saved.notifications },
    }
  } catch {
    return { theme: 'dark' as Theme, language: 'es', playback: DEFAULT_PLAYBACK, notifications: DEFAULT_NOTIFICATIONS }
  }
}

function Settings() {
  const local = readLocalSettings()
  const [user, setUser] = useState(false)
  const [theme, setTheme] = useState<Theme>(local.theme)
  const [language, setLanguage] = useState(local.language)
  const [playback, setPlayback] = useState<Playback>(local.playback)
  const [notifications, setNotifications] = useState<Notifications>(local.notifications)
  const [cacheSize, setCacheSize] = useState('Calculando…')
  const profile = useServerFn(getProfile)
  const save = useServerFn(saveProfile)
  const client = useQueryClient()
  const navigate = useNavigate()
  const home = useQuery({ queryKey: ['home'], queryFn: () => getHome() })
  const profileQuery = useQuery({ queryKey: ['profile', user], queryFn: () => profile(), enabled: user })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(Boolean(data.user)))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(Boolean(session?.user)))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const data = profileQuery.data
    if (!data) return
    setTheme((data.theme as Theme) || local.theme)
    setNotifications({ ...DEFAULT_NOTIFICATIONS, ...(data.notifications as Partial<Notifications>) })
  }, [profileQuery.data])

  useEffect(() => {
    const applyTheme = () => {
      const dark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('light', !dark)
    }
    applyTheme()
    if (theme !== 'auto') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [theme])

  useEffect(() => {
    const settings = { theme, language, playback, notifications }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    if (navigator.storage?.estimate) navigator.storage.estimate().then(({ usage = 0 }) => setCacheSize(`${(usage / 1024 / 1024).toFixed(1)} MB`))
  }, [theme, language, playback, notifications])

  const persist = async (next: { theme?: Theme; language?: string; playback?: Playback; notifications?: Notifications }) => {
    const values = {
      theme: next.theme ?? theme,
      language: next.language ?? language,
      playback: next.playback ?? playback,
      notifications: next.notifications ?? notifications,
    }
    setTheme(values.theme); setLanguage(values.language); setPlayback(values.playback); setNotifications(values.notifications)
    if (!user) return
    try {
      // Playback/language are kept locally because the existing profiles schema does not contain those columns.
      await save({ data: { timezone: 'UTC', theme: values.theme, notifications: values.notifications } })
      client.invalidateQueries({ queryKey: ['profile', true] })
      toast.success('Preferencias guardadas')
    } catch { toast.error('No se pudieron guardar las preferencias') }
  }

  const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="mb-3 pt-7"><p className="px-2 text-xs font-semibold uppercase text-muted-foreground">{title}</p>{subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}</div>
  )
  const SettingRow = ({ label, subtitle, children }: { label: string; subtitle?: string; children?: ReactNode }) => (
    <div className="grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/50 px-4 py-3 text-sm last:border-b-0"><div className="min-w-0"><p className="font-medium text-foreground">{label}</p>{subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}</div>{children}</div>
  )
   const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) => (
     <Button type="button" variant="ghost" role="switch" aria-label={label} aria-checked={checked} onClick={() => onChange(!checked)} className={`relative !h-8 !w-14 !min-w-14 !shrink-0 !overflow-hidden !rounded-full !border !p-0 !shadow-none transition-colors ${checked ? 'border-primary bg-primary hover:bg-primary/90' : 'border-border bg-secondary hover:bg-secondary'}`}><span className={`absolute left-1 top-1 h-[22px] w-[22px] rounded-full shadow-sm transition-transform duration-200 ease-out ${checked ? 'translate-x-6 bg-primary-foreground' : 'translate-x-0 bg-foreground'}`} /></Button>
   )

  return <Shell title="Configuración">
    <div className="space-y-1">
      <section><SectionHeader title="Apariencia" subtitle="Personaliza cómo se ve la aplicación" /><div className="overflow-hidden rounded-lg bg-card"><SettingRow label="Tema"><div className="flex gap-2">{([['dark', Moon], ['light', Sun], ['auto', Monitor]] as const).map(([value, Icon]) => <Button type="button" variant="ghost" key={value} aria-label={`Tema ${value}`} onClick={() => persist({ theme: value })} className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${theme === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}><Icon size={16} /></Button>)}</div></SettingRow></div></section>

       <section><SectionHeader title="Reproducción" subtitle="Preferencias del reproductor" /><div className="overflow-hidden rounded-lg bg-card"><SettingRow label="Reproducción automática"><Toggle label="Reproducción automática" checked={playback.autoplay} onChange={value => persist({ playback: { ...playback, autoplay: value } })} /></SettingRow><SettingRow label="Continuar desde donde quedó" subtitle="Reanuda el contenido donde lo dejaste"><Toggle label="Continuar desde donde quedó" checked={playback.continue_playback} onChange={value => persist({ playback: { ...playback, continue_playback: value } })} /></SettingRow><SettingRow label="Calidad preferida"><select aria-label="Calidad preferida" value={playback.preferred_quality} onChange={e => persist({ playback: { ...playback, preferred_quality: e.target.value } })} className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"><option value="auto">Automática</option><option value="360p">360p</option><option value="480p">480p</option><option value="720p">720p</option><option value="1080p">1080p</option></select></SettingRow></div></section>

       <section><SectionHeader title="Notificaciones" subtitle="Mantente actualizado con nuevos contenidos" /><div className="overflow-hidden rounded-lg bg-card"><SettingRow label="Activar notificaciones"><Toggle label="Activar notificaciones" checked={notifications.enabled} onChange={value => persist({ notifications: { ...notifications, enabled: value } })} /></SettingRow><SettingRow label="Nuevos estrenos" subtitle="Avisos de nuevos anime"><Toggle label="Nuevos estrenos" checked={notifications.enabled && notifications.new_anime} onChange={value => persist({ notifications: { ...notifications, new_anime: value } })} /></SettingRow><SettingRow label="Nuevos capítulos" subtitle="Cuando salga un episodio"><Toggle label="Nuevos capítulos" checked={notifications.enabled && notifications.new_episode} onChange={value => persist({ notifications: { ...notifications, new_episode: value } })} /></SettingRow></div></section>

      <section><SectionHeader title="Desarrollador" /><div className="rounded-lg bg-card p-5"><div className="mb-4 flex items-center gap-4"><img src={developerProfile.url} alt="Perfil de Marlon Samir" width={56} height={56} referrerPolicy="no-referrer" className="h-14 w-14 shrink-0 rounded-2xl object-cover" /><div className="min-w-0"><p className="flex items-center gap-1.5 font-semibold text-foreground">Marlon Samir<BadgeCheck size={18} className="shrink-0 text-primary" aria-label="Insignia de perfil" /></p><p className="text-sm text-muted-foreground">Developer of Anime Orbit</p></div></div><p className="mb-4 text-sm leading-relaxed text-muted-foreground">Anime Orbit is a project developed with the goal of providing a modern, organized, and seamless experience for discovering and enjoying anime content. The project continues to evolve with new features, performance improvements, and regular updates focused on delivering a better experience for every user.</p><Button asChild className="w-full gap-2" variant="secondary"><a href="https://www.instagram.com/nryukx/" target="_blank" rel="noreferrer"><Instagram size={18} />Instagram</a></Button></div></section>


      <section><SectionHeader title="Descargas y almacenamiento" subtitle="Gestiona el espacio de tu dispositivo" /><div className="overflow-hidden rounded-lg bg-card"><SettingRow label="Contenido descargado" subtitle="Las descargas aparecerán aquí"><span className="text-sm text-muted-foreground">0 archivos</span></SettingRow><SettingRow label="Espacio utilizado" subtitle="Caché y datos locales"><span className="text-sm font-medium text-foreground">{cacheSize}</span></SettingRow><SettingRow label="Limpiar caché"><Button type="button" variant="ghost" size="sm" onClick={() => { localStorage.removeItem(STORAGE_KEY); setCacheSize('0 MB'); toast.success('Caché limpiado correctamente') }}><HardDrive size={16} />Limpiar</Button></SettingRow></div></section>

      <section><SectionHeader title="Idioma" subtitle="Selecciona el idioma de la aplicación" /><div className="overflow-hidden rounded-lg bg-card"><SettingRow label="Idioma de la aplicación"><select aria-label="Idioma de la aplicación" value={language} onChange={e => persist({ language: e.target.value })} className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"><option value="es">Español</option><option value="en">English (próximamente)</option></select></SettingRow></div></section>

      <section><SectionHeader title="Privacidad" subtitle="Información clara y control local" /><div className="overflow-hidden rounded-lg bg-card"><SettingRow label="Datos utilizados" subtitle="Solo preferencias, sesión y datos necesarios para la aplicación"><ChevronRight size={18} className="text-muted-foreground" /></SettingRow><SettingRow label="Información local" subtitle="Tema, reproducción y preferencias se almacenan en este dispositivo"><ChevronRight size={18} className="text-muted-foreground" /></SettingRow><SettingRow label="Preferencias de privacidad" subtitle="No solicitamos datos innecesarios"><ChevronRight size={18} className="text-muted-foreground" /></SettingRow></div></section>

      <section><SectionHeader title="Acerca de Anime Orbit" /><div className="space-y-3 rounded-lg bg-card p-5"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Aplicación</span><span className="font-medium text-foreground">Anime Orbit</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Versión</span><span className="font-medium text-foreground">{APP_VERSION}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Estado</span><span className="text-primary">En línea</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Sincronización</span><span className="font-medium text-foreground">{home.data?.lastRun?.status === 'success' ? 'Actualizado' : home.data?.lastRun?.status === 'error' ? 'Error' : 'Pendiente'}</span></div><p className="pt-2 text-xs leading-relaxed text-muted-foreground">Proyecto independiente desarrollado para descubrir y disfrutar anime de forma organizada.</p></div></section>

      {user && <section className="border-t border-border pb-24 pt-6"><Button variant="destructive" className="w-full gap-2" onClick={async () => { await client.cancelQueries(); client.clear(); await supabase.auth.signOut(); navigate({ to: '/auth', replace: true }) }}><LogOut size={18} />Cerrar sesión</Button></section>}
    </div>
  </Shell>
}
