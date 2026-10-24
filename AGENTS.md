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

## InboxPilot architecture
- Frontend only: never add Lovable Cloud, auth, database or server functions; the real backend is a separate local FastAPI server.
- All backend access goes through `src/lib/api.ts`, which switches between real HTTP and the mock engine in `src/lib/mock.ts` (and falls back to mock when the server is unreachable), so pages never call fetch directly.
- Client settings live in the external store `src/lib/store.ts` (persisted to localStorage, loaded in an effect) to avoid hydration mismatches.
- Manual-review state is always derived via `evaluateReview` in `src/lib/escalation.ts` so threshold changes apply instantly without re-running.
