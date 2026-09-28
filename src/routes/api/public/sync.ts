import { createFileRoute } from '@tanstack/react-router'
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth'
export const Route = createFileRoute('/api/public/sync')({ server: { handlers: { POST: async ({ request }) => {
  const denied = await authenticateCronRequest(request)
  if (denied) return denied
  const { runAnimeSync } = await import('@/lib/sync/anime.server')
  const { runVideoSync } = await import('@/lib/sync/videos.server')
  const anime = await runAnimeSync('scheduled')
  const videos = await runVideoSync('scheduled-videos')
  return Response.json({ anime, videos })
} } } })
