import { createFileRoute } from '@tanstack/react-router'
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth'
export const Route = createFileRoute('/api/public/sync-videos')({ server: { handlers: { POST: async ({ request }) => {
  const denied = await authenticateCronRequest(request)
  if (denied) return denied
  const { runVideoSync } = await import('@/lib/sync/videos.server')
  return Response.json(await runVideoSync('scheduled-videos'))
} } } })
