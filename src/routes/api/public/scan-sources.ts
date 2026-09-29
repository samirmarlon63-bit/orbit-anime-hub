import { createFileRoute } from '@tanstack/react-router'
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth'
// Programación (pg_cron + pg_net), ejemplo cada 15 min; cada fuente respeta su propio intervalo:
// select cron.schedule('scan-sources', '*/15 * * * *', $$ select net.http_post(
//   url := 'https://project--<id>.lovable.app/api/public/scan-sources',
//   headers := jsonb_build_object('Authorization', 'Bearer ' || <secreto del programador>)) $$);
export const Route = createFileRoute('/api/public/scan-sources')({ server: { handlers: { POST: async ({ request }) => {
  const denied = await authenticateCronRequest(request)
  if (denied) return denied
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { syncAll } = await import('@/lib/sources/engine.server')
  return Response.json({ results: await syncAll(supabaseAdmin, { onlyDue: true }) })
} } } })
