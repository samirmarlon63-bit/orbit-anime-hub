# Anime Realm

Crea una aplicación web premium para descubrir y ver anime, estilo app nativa de iPhone (iOS 26, glassmorphism, fondo oscuro elegante, iconos minimalistas, sin emojis). La app se llamará **"Anime Orbit"**.

### Stack y arquitectura

- TanStack Start (React 19, router file-based en `src/routes/`) + Tailwind CSS 4.
- Supabase: base de datos, Auth y Storage.
- react-query para fetching de datos.
- Iconos con lucide-react (solo iconos, nunca emojis).
- Variables de entorno para todas las claves (nunca en el frontend).
- Rutas: `/` (Nuevos), `/guardados`, `/videos`, `/videos/$id`, `/configuracion`, `/admin`, `/api/public/sync`, `/api/public/sync-videos`.
- Sincronización en el servidor (no depende de que la app esté abierta), con lock para evitar corridas paralelas y registro en tabla `sync_runs`.

### Base de datos (tablas Supabase)

- `animes`: título (romaji/english/native), sinónimos, `search_keys` para deduplicación, portada, sinopsis, géneros, estudio, plataformas, temporada, fecha de estreno, `date_confirmed`, `airing_at`, estado, popularidad.
- `news_sources`, `discoveries`, `anime_changes`, `sync_runs` (con `trigger`, `status`, `stats` jsonb, `errors` jsonb, `started_at`, `finished_at`).
- **`video_animes`**: `id`, `title`, `cover_url`, `synopsis`, `status` (`airing`/`finished`), `episodes_total`, `external_slug` (text, identificador del anime en la fuente externa), `source_name`, `youtube_playlist_id`, `last_synced_at`, `last_sync_error`, `updated_at`.
- **`video_episodes`**: `video_anime_id`, `number` (numeric), `title`, unique(`video_anime_id, number`).
- **`video_sources`**: `episode_id`, `label`, `kind` (`iframe`/`youtube`/`external`), `url`, unique(`episode_id, url`).
- **`video_sources_catalog`** (fuentes de video gestionables desde admin): `name`, `base_url`, `kind`, `enabled`, `last_checked_at`, `last_error`. RLS: lectura pública, escritura solo admins (mismo patrón que `news_sources`).
- **`video_changes`** (histórico): `video_anime_id`, `kind` (`episode_added`, `source_changed`), `old_value`, `new_value`, `source_name`, `created_at`.

### Navegación (barra inferior translúcida estilo iOS, 3 tabs)

1. **Nuevos** — estrenos próximos en orden cronológico. Cada elemento: portada, nombre, título original, fecha y hora exacta de estreno, zona horaria, día de la semana, mes y año, temporada, episodio si está disponible, estado, géneros, estudio, plataforma, sinopsis breve, estado de fecha (Confirmada / Por confirmar), fuente y última actualización. Si un dato no existe, mostrar "Por confirmar". Botón para guardar.
2. **Guardados** — animes guardados por el usuario (por `user_id`).
3. **Configuración** — zona horaria, tema, notificaciones toggleables, "Última sincronización" con fecha exacta y estado (Sincronización correcta / Error de sincronización).

**Accesibles desde Configuración:** pestaña **Videos** (`/videos`) y **Administración** (`/admin`, noindex, solo usuarios con rol admin vía RPC `has_role`).

### Pestaña VIDEOS (reproducción real)

- `/videos` — grid de 2 columnas con portadas 2:3, filtros Todos / En emisión / Finalizados, buscador, badge de estado, contador de capítulos y "Último: N".
- `/videos/$id` — reproductor 16:9 sticky, lista de capítulos ordenada del más nuevo arriba con badge "Nuevo" en el último, selector de servidores por capítulo (chips horizontales desplazables), sinopsis del anime.
- **Reproductor:** si `video_sources.kind` es `iframe`, embeber la URL en un iframe a pantalla completa dentro del contenedor 16:9; si es `youtube`, embeber vía `youtube-nocookie.com/embed`; si es `external`, mostrar un enlace "Ver en {label}" que abre en pestaña nueva.
- **Arquitectura de datos:** los animes y capítulos se leen de `video_animes` / `video_episodes` / `video_sources` (rellenadas por el backend). Deja preparado un módulo server-side `src/lib/sync/videos.server.ts` con una función `runVideoSync(trigger)` que recorre las fuentes activas de `video_sources_catalog` y agrega capítulos nuevos y sus servidores de reproducción. Incluye rate-limit entre requests, registro de errores por fuente en `last_sync_error`, y cron `/api/public/sync-videos` con auth que la ejecuta periódicamente.
- **Deduplicación:** si un anime ya existe en `animes` (de AniList/Jikan), vincularlo con `video_animes` por títulos normalizados / `search_keys`, sin crear registros duplicados.

### Panel /admin

- Login con Supabase Auth + verificación de rol admin vía RPC `has_role`.
- Secciones: ejecutar sincronización manual (general y de videos), ver historial de runs con stats y errores, **gestionar fuentes de video** (`video_sources_catalog`: agregar validando que el sitio responde, eliminar, activar/desactivar), ver animes de video con su última sincronización y estado, información pendiente de confirmar, animes detectados recientemente, y fuentes asociadas a cada anime.
- Toasts de éxito/error en cada acción.
- Panel oculto a usuarios normales (noindex, gated por rol).

### Comportamiento de datos reales (no datos de ejemplo)

- No usar datos estáticos ni de ejemplo. Todo se obtiene de APIs reales (AniList, Jikan) y de las fuentes de video configuradas.
- Si una fuente da datos contradictorios, no sobrescribir datos confirmados; marcar como conflicto para revisión en admin.
- Registrar siempre la fuente original de cada dato, fecha de detección y última comprobación.
- Si un dato no se puede confirmar, mostrar "Por confirmar".
- Detección de cambios de fecha con histórico en `anime_changes`.
- Cron server-side cada 2 horas: AniList + Jikan + Noticias + Videos, con lock, stats y errores en `sync_runs`.
- Caché, manejo de errores, rate-limits y prevención de requests innecesarias.

### Notificaciones (preparado, no necesariamente implementado)

- Sistema preparado para push notifications cuando: anime nuevo, fecha confirmada/cambiada, episodio nuevo, estreno cercano, retraso. Toggles en Configuración.

### Diseño

- iOS 26: glassmorphism avanzado, fondo oscuro, elementos translúcidos, desenfoque realista, barra inferior de vidrio, animaciones suaves, microinteracciones, transiciones entre pantallas, esquinas redondeadas, espaciado amplio, tipografía limpia, jerarquía visual clara, adaptado a iPhone.
- NO: emojis, colores brillantes, botones gigantes, tarjetas enormes, bordes gruesos, sombras exageradas, look de dashboard genérico, apariencia de página web.

Q la pantalla no se acerque al escribir q es incomodo

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://orbit-anime-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7dd8e615-18aa-4765-bbc5-bb13eaa95eb3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
