<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Public anime and video catalogues use read-only RLS access; personal saves and preferences stay owner-scoped, while administration uses separate role rows and server verification, because catalogue browsing must not require login.
- Synchronization logic lives in server-only helpers and public cron routes require a shared scheduler credential, because external ingestion must not execute in browsers.
- The shared Shell owns the four-tab mobile navigation while catalogue and playback routes retain their original data functions, because visual changes must not break public video access.
- Guest collections use device-local IDs while signed-in collections remain owner-scoped in Cloud, because visitors must save anime without exposing anyone else's private collection.
