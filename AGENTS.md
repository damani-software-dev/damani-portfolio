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

## Architecture rules
- Public pages live under the `_site` pathless layout and read data through server functions in `src/lib/public.functions.ts` (publishable client, RLS-limited to published rows) so SSR/SEO works.
- Admin (`/admin/*`) is client-only (`ssr: false`) and writes via the browser client in `src/lib/admin-api.ts`; RLS with `public.is_admin()` is the real authorization.
- Admin role is granted only by the `handle_admin_user` trigger to the owner email; public signup is disabled, so accounts are created in Cloud Users.
- Case-study content is stored as ordered typed blocks in `project_sections` (zod schemas in `src/lib/blocks.ts`); never store HTML.
- Media bucket `portfolio-media` is private (workspace blocks public buckets); store storage paths in DB and sign URLs at read time, never persist URLs.
