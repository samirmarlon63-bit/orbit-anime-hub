import { useEffect, useRef } from 'react'

type Kind = 'iframe' | 'youtube' | 'mp4' | 'hls'

function youtubeEmbed(url: string) {
  try { const p = new URL(url); const id = p.hostname.includes('youtu.be') ? p.pathname.slice(1) : p.searchParams.get('v') ?? p.pathname.split('/').pop(); return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?playsinline=1` : null } catch { return null }
}

export function VideoPlayer({ url, kind, title }: { url: string; kind: Kind; title: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v || kind !== 'hls') return
    // iPhone reproduce HLS de forma nativa; Android/escritorio usan hls.js.
    if (v.canPlayType('application/vnd.apple.mpegurl')) { v.src = url; return }
    let hls: { destroy: () => void } | null = null
    import('hls.js').then(({ default: Hls }) => { if (Hls.isSupported()) { const h = new Hls(); h.loadSource(url); h.attachMedia(v); hls = h } else v.src = url })
    return () => hls?.destroy()
  }, [url, kind])
  if (kind === 'mp4' || kind === 'hls') return <video ref={ref} key={url} src={kind === 'mp4' ? url : undefined} controls playsInline preload="metadata" title={title} className="h-full w-full bg-background" />
  const src = kind === 'youtube' ? youtubeEmbed(url) : url
  if (!src) return null
  return <iframe key={src} src={src} title={title} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen className="h-full w-full border-0" />
}
