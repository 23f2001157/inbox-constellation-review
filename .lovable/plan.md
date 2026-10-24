# InboxPilot — Frontend for a five-agent email triage assistant

Frontend only. No Lovable Cloud, no auth, no database, no server functions. Talks to your local FastAPI server, or uses built-in mock data.

## Pages (separate routes, left sidebar nav with logo)
- `/` Workspace — pipeline strip on top; three panes: inbox list (search, category/urgency/needs-review filter chips, urgency bar, badges, duplicate and review icons), email view (inline highlights for cues/deadlines/entities with tooltips, raw vs cleaned toggle with quoted history struck through), agent panel (Triage / Context / Reply / Quality tabs). Selecting an email runs the pipeline.
- `/compose` — subject + body, 4 preset chips, Run pipeline, same strip + panel, duplicate notice.
- `/benchmark` — Run button, metric cards, reply-relevance bar chart, confusion heatmap, latency summary, per-email table with correct/incorrect filter.
- `/how-it-works` — interactive architecture diagram (5 agents + shared state), agent detail on hover/click, graceful-degradation explainer.
- `/settings` — Use local LLM toggle + live Ollama status dot, escalation threshold slider (0.1–0.9, re-evaluates review state live and is sent on next run), reference date, theme toggle, mock/real switch.

Shared: Cmd/Ctrl+K command palette (pages + emails), light/dark toggle, toasts, skeletons, "Backend offline, using mock data" banner, footer "Runs fully local, no data leaves your machine".

## Pipeline strip
Five nodes Input → Triage → Context → Reply → Quality with connecting lines. States idle → pulsing running → done (check, ms, confidence ring, LLM/Rules badge) or greyed "skipped". Click a node to jump to its tab. Shows total_ms.

## Look and feel
Inter font, indigo/violet primary, soft gradients, rounded-2xl glass cards, category colours (urgent red, action orange, meeting blue, follow-up amber, informational slate, low priority gray) as semantic tokens in styles.css. Framer Motion transitions, fully responsive.

## Technical details
- `src/lib/api.ts`: contract types, `VITE_API_URL` (default http://localhost:8000), `VITE_USE_MOCK` default "true", overridable at runtime from Settings (stored locally). Streaming via fetch + ReadableStream parsing `event:`/`data:` blocks. Automatic fallback to mock with banner when backend unreachable.
- `src/lib/mock.ts`: 8 emails with full ProcessResult fixtures (urgent, meeting, informational skipping Reply/Quality, escalated "Following up - any update?", duplicate, others), mock BenchmarkReport, timer-based stream simulation, tone-based regenerate.
- Settings/theme context provider in root; TanStack Query for emails, health, benchmark; mutations for run/regenerate.
- Install framer-motion, recharts, cmdk and needed shadcn components.
- Per-route head() metadata; replace placeholder index.
- Small vitest tests for the escalation-threshold rule and stream parser.
