# Inbox Constellation Review

Build "InboxPilot", a polished, interactive web UI for a five-agent email triage assistant (Input, Triage, Context, Reply, Quality agents). Frontend only: React + Vite + TypeScript + Tailwind + shadcn/ui + Framer Motion + Recharts + lucide-react + TanStack Query. DO NOT add Supabase, authentication, a database, or any backend/edge functions. The real backend is a separate local FastAPI server described by the API contract at the bottom.

## Data layer (important)
- One typed API client (src/lib/api.ts) with types copied from the contract. Base URL from import.meta.env.VITE_API_URL (default http://localhost:8000). Flag VITE_USE_MOCK (default "true"): when true, serve realistic mock data from src/lib/mock.ts (8 varied sample emails with full ProcessResult fixtures, including one urgent, one meeting request, one informational that skips Reply/Quality, one escalated "Following up - any update?", one duplicate; plus a mock BenchmarkReport). In mock mode, simulate the streaming endpoint with timers so the agent animation works. In real mode, call POST /api/process/stream using fetch + ReadableStream and parse "event:/data:" blocks (do NOT use EventSource, it can't POST).
- Show a clear error/empty state and a "Backend offline, using mock data" banner if the backend can't be reached.

## Look and feel
Modern, calm, premium. Light and dark mode with a toggle. Indigo/violet primary accent, soft gradients, rounded-2xl cards, subtle glass effects, Inter font. Category colours: urgent red, action orange, meeting blue, follow-up amber, informational slate, low priority gray. Smooth Framer Motion transitions, skeleton loaders, toasts, hover states, fully responsive. A command palette (Ctrl/Cmd+K) to jump between pages and emails. Left sidebar nav with logo.

## Pages
1. Workspace (home): three panes. Left: inbox list with search, filter chips (category, urgency, needs review), urgency bar and category badge per row, duplicate and "needs review" icons. Centre: selected email with the cleaned text where triage cues, deadlines and entities are HIGHLIGHTED inline using the char offsets from the result (colour-coded, tooltip showing the weight/type/resolved date), a toggle to show raw vs cleaned (quoted history struck through). Right: Agent panel with tabs Triage (category, urgency gauge, confidence ring, list of cues and why), Context (deadline chips with resolved dates, entity chips by type, actions, questions, summary), Reply (editable draft, tone selector formal/friendly/brief with a Regenerate button, Copy button, and a badge "LLM draft" or "Template draft"), Quality (check list with pass/fail icons, aggregate confidence vs threshold bar, escalation banner with reasons if needs_manual_review and the draft hidden/locked). Selecting an email runs the pipeline.
2. Pipeline strip (top of Workspace and Compose): five animated agent nodes Input -> Triage -> Context -> Reply -> Quality connected by lines. As streaming events arrive each node goes idle -> pulsing "running" -> done with a check, duration in ms, confidence ring, and an "LLM" or "Rules" badge (from trace.used_llm/model). Skipped agents are greyed with "skipped". Clicking a node scrolls to that agent's output tab. Show total_ms.
3. Compose & Test: textarea (plus optional subject) with 4 example-chip presets, a "Run pipeline" button, the same live pipeline strip and agent panel, and a duplicate-detection notice.
4. Benchmark: "Run benchmark" button plus metric cards (triage accuracy, urgency accuracy, deadline P/R, entity P/R, reply relevance mean labelled "automated rubric", escalation rate, mean latency), a reply-relevance distribution bar chart, a category confusion-matrix heatmap, a latency summary, and a table of per-email results with correct/incorrect filter.
5. How it works: an interactive architecture diagram of the five agents and shared state; hover/click an agent to see what it does, its technique, and whether it can use the LLM; a short "graceful degradation" explainer showing which agents are skipped for informational mail.
6. Settings: toggle "Use local LLM (Ollama)" with a live status dot from /api/health, escalation threshold slider (0.1-0.9) that immediately re-evaluates needs_manual_review in the UI using quality.aggregate_confidence and also sends escalation_threshold on the next run, reference date display, theme toggle, mock/real data switch.

## Quality bar
No placeholder lorem ipsum, no dead buttons, every control works in mock mode. Keep components small and typed. Add a footer line "Runs fully local, no data leaves your machine".

# InboxPilot API contract (base URL http://localhost:8000)

GET  /api/health          -> {status:"ok", ollama:{up:bool, model:string|null}, version:string}
GET  /api/emails          -> [{id, sender, subject, body, received_at, label?:{category, urgency}}]   (the labelled sample inbox)
POST /api/process         body {subject?:string, body:string, use_llm?:bool, tone?:"formal"|"friendly"|"brief", escalation_threshold?:number}  -> ProcessResult
POST /api/process/stream  same body -> streamed events (newline-delimited "event: <name>\ndata: <json>\n\n", consume with fetch + ReadableStream, NOT EventSource):
                          agent_start {agent}, agent_done {agent, trace, output}, complete {result: ProcessResult}, error {message}
POST /api/batch           body {emails:[{id?, subject?, body}], use_llm?:bool} -> {results:[ProcessResult]}
POST /api/reply/regenerate body {result_id?:string, body:string, tone:string, use_llm?:bool} -> {reply: Reply}
GET  /api/benchmark       -> BenchmarkReport (cached last run, or computed if none)
POST /api/benchmark/run   body {use_llm?:bool} -> BenchmarkReport
GET  /api/settings        -> {use_llm:bool, escalation_threshold:number, ollama_model:string, reference_date:string}
PUT  /api/settings        body same as above -> same

ProcessResult = {
  id: string,
  input: {subject: string|null, raw: string},
  valid: bool, rejection_reason: string|null,
  input_agent: {cleaned, salutation, body, closing, quoted_ratio: number, quoted_stripped: bool, confidence: number},
  triage: {category: "urgent_request"|"action_request"|"meeting_coordination"|"follow_up"|"informational"|"low_priority",
           urgency_score: number, high_urgency: bool, confidence: number, llm_disambiguated: bool,
           cues: [{text, start, end, kind: "strong"|"weak"|"suppress"|"category", weight: number}]},   // start/end are char offsets into input_agent.cleaned
  context: {deadlines: [{phrase, resolved_date: "YYYY-MM-DD"|null, start, end}],
            entities: [{text, type: "person"|"org"|"project"|"email"|"url", start, end}],
            actions: [string], questions: [string], summary: string, confidence: number},
  reply: {draft: string|null, tone: string, source: "llm"|"template"|"none", confidence: number},
  quality: {checks: [{name: "toxicity"|"draft_exists"|"deadline_consistency"|"politeness"|"length", passed: bool, detail: string}],
            aggregate_confidence: number, threshold: number, needs_manual_review: bool, escalation_reasons: [string]},
  duplicate: {is_duplicate: bool, similarity: number, matched_id: string|null},
  trace: [{agent: "input"|"triage"|"context"|"reply"|"quality", status: "done"|"skipped"|"failed", started_ms: number, duration_ms: number, used_llm: bool, model: string|null, message: string}],
  total_ms: number
}

BenchmarkReport = {n: number, reference_date: string, llm_used: bool,
  triage_accuracy, urgency_accuracy, deadline_precision, deadline_recall, entity_precision, entity_recall,
  reply_relevance_mean, reply_relevance_dist: {good, acceptable, poor, none}, escalation_rate, duplicate_handling_rate, explainability_score,
  latency_ms: {mean, median, p95},
  confusion: {labels:[string], matrix:[[number]]},
  per_email: [{id, expected_category, predicted_category, expected_urgency, predicted_urgency, correct: bool}]}

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://inbox-constellation-review.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dc2c89f4-5038-4291-a297-0f5453c6343d).

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
