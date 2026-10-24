import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, Copy as CopyIcon, Inbox, Play, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PipelineStrip } from "@/components/ip/PipelineStrip";
import { AgentPanel, type PanelTab } from "@/components/ip/AgentPanel";
import { HighlightedText, Legend, RawText } from "@/components/ip/EmailText";
import { CategoryBadge, UrgencyBar } from "@/components/ip/primitives";
import { usePipeline } from "@/hooks/use-pipeline";
import { api } from "@/lib/api";
import { evaluateReview } from "@/lib/escalation";
import { useSettings } from "@/lib/store";
import { CATEGORIES, type AgentName, type Category, type ProcessResult } from "@/lib/types";
import { CATEGORY_META } from "@/lib/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { email?: string } => (typeof s.email === "string" ? { email: s.email } : {}),
  head: () => ({
    meta: [
      { title: "Workspace · InboxPilot" },
      { name: "description", content: "Triage your inbox with five local agents: input, triage, context, reply and quality." },
      { property: "og:title", content: "InboxPilot Workspace" },
      { property: "og:description", content: "Five-agent email triage with explainable highlights and reply drafts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Workspace,
});

export function scrollToAgent(a: AgentName, setTab: (t: PanelTab) => void) {
  if (a === "input") document.getElementById("email-view")?.scrollIntoView({ behavior: "smooth", block: "start" });
  else {
    setTab(a);
    document.getElementById("agent-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

type Filter = { q: string; cat: Category | null; urgent: boolean; review: boolean };

function Workspace() {
  const { email } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const settings = useSettings();
  const emailsQ = useQuery({ queryKey: ["emails", settings.useMock], queryFn: api.emails });
  const emails = emailsQ.data ?? [];
  const batchQ = useQuery({
    queryKey: ["batch", settings.useMock, settings.useLlm, emails.map((e) => e.id).join()],
    queryFn: () => api.batch(emails.map((e) => ({ id: e.id, subject: e.subject, body: e.body }))),
    enabled: emails.length > 0,
  });
  const byId = useMemo(() => {
    const m = new Map<string, ProcessResult>();
    batchQ.data?.results.forEach((r, i) => emails[i] && m.set(emails[i].id, r));
    return m;
  }, [batchQ.data, emails]);

  const [f, setF] = useState<Filter>({ q: "", cat: null, urgent: false, review: false });
  const [raw, setRaw] = useState(false);
  const [tab, setTab] = useState<PanelTab>("triage");
  const p = usePipeline();
  const selectedId = email ?? emails[0]?.id;
  const selected = emails.find((e) => e.id === selectedId);

  useEffect(() => {
    if (selected) p.run({ subject: selected.subject, body: selected.body }, selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, settings.useLlm, settings.useMock]);

  const visible = emails.filter((e) => {
    const r = byId.get(e.id);
    if (f.q && !`${e.subject} ${e.sender} ${e.body}`.toLowerCase().includes(f.q.toLowerCase())) return false;
    if (f.cat && r?.triage.category !== f.cat) return false;
    if (f.urgent && !r?.triage.high_urgency) return false;
    if (f.review && !(r && evaluateReview(r, settings.threshold).needsReview)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <PipelineStrip nodes={p.nodes} result={p.result} onSelect={(a) => scrollToAgent(a, setTab)} />
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_420px] lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Inbox */}
        <section className="glass flex max-h-[calc(100vh-220px)] min-h-[400px] flex-col rounded-2xl p-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Search inbox" className="rounded-xl pl-9" />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setF({ ...f, cat: f.cat === c ? null : c })} className={cn("rounded-full border px-2 py-0.5 text-[11px] transition", f.cat === c ? CATEGORY_META[c].cls : "text-muted-foreground hover:bg-accent")}>
                {CATEGORY_META[c].label}
              </button>
            ))}
            <button onClick={() => setF({ ...f, urgent: !f.urgent })} className={cn("rounded-full border px-2 py-0.5 text-[11px]", f.urgent ? "bg-cat-urgent/12 text-cat-urgent border-cat-urgent/30" : "text-muted-foreground hover:bg-accent")}>High urgency</button>
            <button onClick={() => setF({ ...f, review: !f.review })} className={cn("rounded-full border px-2 py-0.5 text-[11px]", f.review ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground hover:bg-accent")}>Needs review</button>
          </div>
          <div className="mt-3 -mx-1 flex-1 space-y-1 overflow-y-auto px-1">
            {emailsQ.isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            {emailsQ.isError && <p className="p-4 text-sm text-destructive">Could not load the inbox.</p>}
            {!emailsQ.isLoading && visible.length === 0 && (
              <div className="grid place-items-center py-10 text-center text-sm text-muted-foreground"><Inbox className="mb-2 h-6 w-6" />No emails match these filters.</div>
            )}
            {visible.map((e) => {
              const r = byId.get(e.id);
              const review = r && evaluateReview(r, settings.threshold).needsReview;
              return (
                <motion.button
                  layout
                  key={e.id}
                  onClick={() => navigate({ search: { email: e.id } })}
                  className={cn("w-full rounded-xl border border-transparent p-2.5 text-left transition hover:bg-accent/60", e.id === selectedId && "border-primary/40 bg-accent/50")}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs text-muted-foreground">{e.sender.split("<")[0].trim()}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-1">
                      {r?.duplicate.is_duplicate && <CopyIcon className="h-3.5 w-3.5 text-cat-info" aria-label="Duplicate" />}
                      {review && <AlertTriangle className="h-3.5 w-3.5 text-cat-urgent" aria-label="Needs review" />}
                    </span>
                  </div>
                  <p className="truncate text-sm font-medium">{e.subject}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    {r ? <CategoryBadge category={r.triage.category} /> : <Skeleton className="h-4 w-16" />}
                    <UrgencyBar value={r?.triage.urgency_score ?? 0} className="flex-1" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Email */}
        <section id="email-view" className="glass min-h-[400px] rounded-2xl p-5">
          {!selected ? (
            emailsQ.isLoading ? <Skeleton className="h-64 w-full" /> : <p className="text-sm text-muted-foreground">Select an email to run the pipeline.</p>
          ) : (
            <motion.div key={selected.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight">{selected.subject}</h2>
                  <p className="text-sm text-muted-foreground">{selected.sender} · {new Date(selected.received_at).toUTCString().slice(0, 22)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">Raw <Switch checked={raw} onCheckedChange={setRaw} /></label>
                  <Button size="sm" variant="outline" onClick={() => p.run({ subject: selected.subject, body: selected.body }, selected.id)} disabled={p.running}>
                    <Play className="mr-1 h-3.5 w-3.5" /> Re-run
                  </Button>
                </div>
              </div>
              {p.result?.duplicate.is_duplicate && (
                <div className="rounded-xl bg-cat-info/12 px-3 py-2 text-sm">Duplicate of <b>{p.result.duplicate.matched_id}</b> ({Math.round(p.result.duplicate.similarity * 100)}% similar)</div>
              )}
              <div className="rounded-xl bg-background/50 p-4">
                {raw ? <RawText raw={selected.body} /> : p.result ? <HighlightedText result={p.result} /> : (
                  <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-4/6" /></div>
                )}
              </div>
              {!raw && <Legend />}
              {p.result?.input_agent.quoted_stripped && !raw && (
                <p className="text-xs text-muted-foreground">{Math.round(p.result.input_agent.quoted_ratio * 100)}% quoted history stripped. Toggle Raw to see it.</p>
              )}
            </motion.div>
          )}
        </section>

        <div className="lg:col-span-2 xl:col-span-1">
          <AgentPanel result={p.result} loading={p.running} tab={tab} onTab={setTab} />
        </div>
      </div>
    </div>
  );
}
