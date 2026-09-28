-- Migración para agregar fuentes de video predefinidas y cuenta administradora
-- Ejecutar después de la migración inicial

-- 1. Insertar fuentes de video estables predefinidas
INSERT INTO public.video_sources_catalog (name, base_url, kind, enabled)
VALUES
  ('AnimeOnline Oficial', 'https://veranimeonline.co/api/catalog.json', 'iframe', true),
  ('AnimeAv1', 'https://animeav1.com/api/catalog.json', 'iframe', true),
  ('AnimeFlv', 'https://animeflv.net/api/catalog.json', 'iframe', false),
  ('JKanime', 'https://jkanime.net/api/catalog.json', 'iframe', false)
ON CONFLICT (base_url) DO UPDATE 
SET enabled = EXCLUDED.enabled, name = EXCLUDED.name;

-- 2. Crear/asignar cuenta administradora
-- IMPORTANTE: Debes crear primero el usuario en Supabase Auth con:
-- Email: mayil.ramos.kv@gmail.com
-- Password: Prueva1221
-- Luego obtén su UUID y ejecuta esta consulta (reemplaza UUID_HERE):

-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('UUID_DEL_USUARIO_ADMIN', 'admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- 3. Verificar estructura de sincronización
-- Las tablas sync_runs y video_changes ya existen y están configuradas correctamente
-- Los triggers en Cloudflare/Vercel ejecutarán /api/public/sync cada 2 horas
