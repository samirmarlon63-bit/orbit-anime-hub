import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { getHome, getProfile, saveProfile } from '@/lib/orbit.functions'
import { Shell } from '@/components/orbit-shell'
import { Button } from '@/components/ui/button'
import {
  LogOut, Moon, Sun, Monitor, Bell, HardDrive, Globe, Lock, Info,
  Instagram, ChevronRight, RefreshCw, Volume2, Eye
} from 'lucide-react'
import { toast } from 'sonner'

const APP_VERSION = '1.0.0'

export const Route = createFileRoute('/configuracion')({
  head: () => ({
    meta: [
      { title: 'Configuración — Anime Orbit' },
      { name: 'description', content: 'Personaliza tu experiencia en Anime Orbit.' },
    ],
  }),
  component: Settings,
})

function Settings() {
  const [user, setUser] = useState(false)
  const [timezone, setTimezone] = useState('UTC')
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('dark')
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    new_anime: true,
    new_episode: true,
  })
  const [playback, setPlayback] = useState<Record<string, boolean | string>>({
    autoplay: false,
    continue_playback: true,
    preferred_quality: '720p',
  })
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const profile = useServerFn(getProfile)
  const save = useServerFn(saveProfile)
  const client = useQueryClient()
  const navigate = useNavigate()

  const home = useQuery({
    queryKey: ['home'],
    queryFn: () => getHome(),
  })

  const p = useQuery({
    queryKey: ['profile', user],
    queryFn: () => profile(),
    enabled: user,
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(Boolean(data.user)))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(Boolean(session?.user))
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (p.data) {
      setTimezone(p.data.timezone || 'UTC')
      const savedTheme = (p.data.theme as 'light' | 'dark' | 'auto') || 'dark'
      setTheme(savedTheme)
      setNotifications(p.data.notifications as Record<string, boolean>)
      if (p.data.playback) setPlayback(p.data.playback as Record<string, boolean | string>)
    } else if (!user) {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
    }
  }, [p.data, user])

  useEffect(() => {
    const html = document.documentElement
    if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      html.classList.toggle('light', !isDark)
    } else {
      html.classList.toggle('light', theme === 'light')
    }
  }, [theme])

  const updateSettings = async (updates: Partial<{
    timezone: string
    theme: 'light' | 'dark' | 'auto'
    notifications: Record<string, boolean>
    playback: Record<string, boolean | string>
  }>) => {
    if (updates.timezone) setTimezone(updates.timezone)
    if (updates.theme) setTheme(updates.theme)
    if (updates.notifications) setNotifications(updates.notifications)
    if (updates.playback) setPlayback(updates.playback)

    if (user) {
      try {
        await save({
          data: {
            timezone: updates.timezone || timezone,
            theme: updates.theme || theme,
            notifications: updates.notifications || notifications,
            playback: updates.playback || playback,
          },
        })
        toast.success('Preferencias guardadas')
      } catch {
        toast.error('No se pudieron guardar las preferencias')
      }
    }
  }

  const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="mb-4 pt-6 first:pt-0">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  )

  const SettingRow = ({ 
    label, 
    subtitle, 
    children, 
    onClick 
  }: { 
    label: string
    subtitle?: string
    children?: React.ReactNode
    onClick?: () => void
  }) => (
    <div 
      onClick={onClick}
      className={`flex min-h-14 items-center justify-between border-t border-border px-0 py-3 text-sm ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex-1">
        <p className="font-medium text-foreground">{label}</p>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  )

  const Toggle = ({ 
    checked, 
    onChange 
  }: { 
    checked: boolean
    onChange: (value: boolean) => void
  }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative flex h-7 w-12 items-center rounded-full transition ${
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}
    >
      <span
        className={`absolute h-5 w-5 rounded-full bg-white shadow-sm transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )

  return (
    <Shell title="Configuración" subtitle="Personaliza tu experiencia">
      <div className="space-y-0 border-t border-border">
        {/* DESARROLLADOR */}
        <section>
          <SectionHeader title="Desarrollador" />
          <div className="border-t border-border px-0 py-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-lg">
                MS
              </div>
              <div>
                <p className="font-semibold text-foreground">Marlon Samir</p>
                <p className="text-sm text-muted-foreground">Developer of Anime Orbit</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground mb-4">
              Anime Orbit is a project developed with the goal of providing a modern, organized, and seamless experience for discovering and enjoying anime content. The project continues to evolve with new features, performance improvements, and regular updates focused on delivering a better experience for every user.
            </p>
            <Button
              onClick={() => window.open('https://www.instagram.com/nryukx/', '_blank')}
              className="w-full gap-2"
              variant="outline"
            >
              <Instagram size={18} />
              Seguir en Instagram
            </Button>
          </div>
        </section>

        {/* APARIENCIA */}
        <section>
          <SectionHeader title="Apariencia" subtitle="Personaliza cómo se ve la aplicación" />
          <SettingRow label="Tema">
            <div className="flex gap-2">
              <button
                onClick={() => updateSettings({ theme: 'dark' })}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  theme === 'dark'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Moon size={16} />
              </button>
              <button
                onClick={() => updateSettings({ theme: 'light' })}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  theme === 'light'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Sun size={16} />
              </button>
              <button
                onClick={() => updateSettings({ theme: 'auto' })}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  theme === 'auto'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Monitor size={16} />
              </button>
            </div>
          </SettingRow>
        </section>

        {/* REPRODUCCIÓN */}
        <section>
          <SectionHeader title="Reproducción" subtitle="Preferencias del reproductor de video" />
          <SettingRow label="Reproducción automática">
            <Toggle
              checked={Boolean(playback.autoplay)}
              onChange={(val) => updateSettings({ playback: { ...playback, autoplay: val } })}
            />
          </SettingRow>
          <SettingRow label="Continuar desde donde quedó" subtitle="Reanuda la reproducción donde la dejaste">
            <Toggle
              checked={Boolean(playback.continue_playback)}
              onChange={(val) => updateSettings({ playback: { ...playback, continue_playback: val } })}
            />
          </SettingRow>
          <SettingRow label="Calidad preferida">
            <select
              value={String(playback.preferred_quality)}
              onChange={(e) => updateSettings({ playback: { ...playback, preferred_quality: e.target.value } })}
              className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground outline-none"
            >
              <option value="360p">360p</option>
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="auto">Automática</option>
            </select>
          </SettingRow>
        </section>

        {/* NOTIFICACIONES */}
        <section>
          <SectionHeader title="Notificaciones" subtitle="Mantente actualizado con nuevos contenidos" />
          <SettingRow label="Nuevos estrenos" subtitle="Avisos de nuevos anime">
            <Toggle
              checked={Boolean(notifications.new_anime)}
              onChange={(val) => updateSettings({ notifications: { ...notifications, new_anime: val } })}
            />
          </SettingRow>
          <SettingRow label="Nuevos capítulos" subtitle="Cuando salga un episodio">
            <Toggle
              checked={Boolean(notifications.new_episode)}
              onChange={(val) => updateSettings({ notifications: { ...notifications, new_episode: val } })}
            />
          </SettingRow>
        </section>

        {/* ALMACENAMIENTO */}
        <section>
          <SectionHeader title="Almacenamiento" subtitle="Gestiona el espacio de tu dispositivo" />
          <SettingRow label="Almacenamiento utilizado" subtitle="Caché y datos de la aplicación">
            <p className="text-sm font-medium text-foreground">~24 MB</p>
          </SettingRow>
          <SettingRow 
            label="Limpiar caché" 
            onClick={() => {
              localStorage.clear()
              toast.success('Caché limpiado correctamente')
            }}
          >
            <ChevronRight size={18} className="text-muted-foreground" />
          </SettingRow>
        </section>

        {/* IDIOMA */}
        <section>
          <SectionHeader title="Idioma" subtitle="Selecciona el idioma de la aplicación" />
          <SettingRow label="Idioma de la aplicación">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Español</span>
              <ChevronRight size={18} className="text-muted-foreground" />
            </div>
          </SettingRow>
        </section>

        {/* PRIVACIDAD */}
        <section>
          <SectionHeader title="Privacidad" subtitle="Controla tus datos personales" />
          <SettingRow label="Datos utilizados" subtitle="Información almacenada en la aplicación">
            <ChevronRight size={18} className="text-muted-foreground" />
          </SettingRow>
          <SettingRow label="Preferencias de privacidad" subtitle="Gestiona tus permisos">
            <ChevronRight size={18} className="text-muted-foreground" />
          </SettingRow>
        </section>

        {/* SINCRONIZACIÓN */}
        <section>
          <SectionHeader title="Sincronización" subtitle="Estado de la aplicación" />
          <SettingRow label="Última sincronización">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {home.data?.lastRun?.status === 'success'
                  ? '✓ Actualizado'
                  : home.data?.lastRun?.status === 'error'
                    ? '✗ Error'
                    : '⟳ Sincronizando'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {home.data?.lastRun?.started_at
                  ? new Date(home.data.lastRun.started_at).toLocaleTimeString('es', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  : 'Pendiente'}
              </p>
            </div>
          </SettingRow>
        </section>

        {/* ACERCA DE */}
        <section>
          <SectionHeader title="Acerca de Anime Orbit" />
          <div className="border-t border-border px-0 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Versión</span>
              <span className="text-sm font-medium text-foreground">{APP_VERSION}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estado</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                En línea
              </span>
            </div>
          </div>
        </section>

        {/* SESIÓN */}
        {user && (
          <section className="border-t border-border pt-6 pb-24">
            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={async () => {
                await client.cancelQueries()
                client.clear()
                await supabase.auth.signOut()
                navigate({ to: '/auth', replace: true })
              }}
            >
              <LogOut size={18} />
              Cerrar sesión
            </Button>
          </section>
        )}
      </div>
    </Shell>
  )
}
