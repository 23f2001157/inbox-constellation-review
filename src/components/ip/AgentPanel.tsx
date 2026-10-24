import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, CalendarClock, CheckCircle2, Copy, HelpCircle, Lock, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { evaluateReview } from "@/lib/escalation";
import { useSettings } from "@/lib/store";
import type { ProcessResult, Reply, Tone } from "@/lib/types";
import { pct } from "@/lib/ui";
import { CategoryBadge, ConfidenceRing, UrgencyGauge } from "./primitives";

export type PanelTab = "triage" | "context" | "reply" | "quality";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}
const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;

function TriageTab({ r }: { r: ProcessResult }) {
  const t = r.triage;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <CategoryBadge category={t.category} className="text-xs" />
          <p className="text-xs text-muted-foreground">{t.high_urgency ? "High urgency" : "Normal urgency"}{t.llm_disambiguated && " · LLM disambiguated"}</p>
        </div>
        <UrgencyGauge value={t.urgency_score} />
        <div className="text-center">
          <ConfidenceRing value={t.confidence} size={52} stroke={5} />
          <p className="mt-1 text-[10px] text-muted-foreground">confidence</p>
        </div>
      </div>
      <Section title={`Cues (${t.cues.length})`}>
        {t.cues.length === 0 ? <Empty>No triage cues found; category inferred from structure.</Empty> : (
          <ul className="space-y-1.5">
            {t.cues.map((c, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-1.5 text-sm">
                <span className="font-medium">“{c.text}”</span>
                <span className="text-xs text-muted-foreground">{c.kind} · {c.weight >= 0 ? "+" : ""}{c.weight.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function ContextTab({ r }: { r: ProcessResult }) {
  const c = r.context;
  return (
    <div className="space-y-5">
      <Section title="Summary"><p className="text-sm">{c.summary}</p></Section>
      <Section title="Deadlines">
        {c.deadlines.length ? (
          <div className="flex flex-wrap gap-2">
            {c.deadlines.map((d, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-cat-followup/15 px-2.5 py-1 text-xs">
                <CalendarClock className="h-3.5 w-3.5 text-cat-followup" /> {d.phrase} → <b>{d.resolved_date ?? "?"}</b>
              </span>
            ))}
          </div>
        ) : <Empty>No deadlines mentioned.</Empty>}
      </Section>
      <Section title="Entities">
        {c.entities.length ? (
          <div className="flex flex-wrap gap-2">
            {c.entities.map((e, i) => (
              <span key={i} className="rounded-full bg-cat-meeting/12 px-2.5 py-1 text-xs text-cat-meeting">
                <span className="opacity-70">{e.type}:</span> {e.text}
              </span>
            ))}
          </div>
        ) : <Empty>No entities detected.</Empty>}
      </Section>
      <Section title="Actions">
        {c.actions.length ? <ul className="list-disc space-y-1 pl-5 text-sm">{c.actions.map((a, i) => <li key={i}>{a}</li>)}</ul> : <Empty>No explicit actions.</Empty>}
      </Section>
      <Section title="Questions">
        {c.questions.length ? (
          <ul className="space-y-1 text-sm">{c.questions.map((q, i) => <li key={i} className="flex gap-2"><HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{q}</li>)}</ul>
        ) : <Empty>No questions asked.</Empty>}
      </Section>
    </div>
  );
}

function ReplyTab({ r, locked }: { r: ProcessResult; locked: boolean }) {
  const [reply, setReply] = useState<Reply>(r.reply);
  const [draft, setDraft] = useState(r.reply.draft ?? "");
  const [tone, setTone] = useState<Tone>((r.reply.tone as Tone) || "friendly");
  const [unlocked, setUnlocked] = useState(false);
  const regen = useMutation({
    mutationFn: (t: Tone) => api.regenerate(r, t),
    onSuccess: ({ reply }) => {
      setReply(reply);
      setDraft(reply.draft ?? "");
      toast.success(`Regenerated ${reply.tone} draft`);
    },
    onError: (e) => toast.error("Regenerate failed", { description: (e as Error).message }),
  });
  if (r.reply.source === "none" && reply.source === "none")
    return (
      <div className="space-y-3">
        <Empty>Reply agent was skipped: informational mail usually needs no response.</Empty>
        <Button size="sm" variant="outline" onClick={() => regen.mutate(tone)} disabled={regen.isPending}>Draft one anyway</Button>
      </div>
    );
  const hidden = locked && !unlocked;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ToggleGroup type="single" size="sm" value={tone} onValueChange={(v) => v && setTone(v as Tone)} className="rounded-lg border p-0.5">
          {(["formal", "friendly", "brief"] as Tone[]).map((t) => (
            <ToggleGroupItem key={t} value={t} className="capitalize">{t}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", reply.source === "llm" ? "bg-brand text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
          {reply.source === "llm" ? "LLM draft" : "Template draft"}
        </span>
      </div>
      <div className="relative">
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={10} className={cn("rounded-xl font-sans text-sm", hidden && "select-none blur-sm")} readOnly={hidden} />
        {hidden && (
          <div className="absolute inset-0 grid place-items-center rounded-xl bg-background/60">
            <div className="text-center">
              <Lock className="mx-auto mb-2 h-5 w-5 text-cat-urgent" />
              <p className="mb-2 text-sm font-medium">Draft locked pending manual review</p>
              <Button size="sm" variant="outline" onClick={() => setUnlocked(true)}>I'll review it</Button>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => regen.mutate(tone)} disabled={regen.isPending}>
          <RefreshCw className={cn("mr-1.5 h-4 w-4", regen.isPending && "animate-spin")} /> Regenerate
        </Button>
        <Button size="sm" variant="outline" disabled={hidden} onClick={() => navigator.clipboard.writeText(draft).then(() => toast.success("Draft copied"))}>
          <Copy className="mr-1.5 h-4 w-4" /> Copy
        </Button>
        <span className="ml-auto self-center text-xs text-muted-foreground">confidence {pct(reply.confidence)}</span>
      </div>
    </div>
  );
}

function QualityTab({ r, threshold, review }: { r: ProcessResult; threshold: number; review: ReturnType<typeof evaluateReview> }) {
  const q = r.quality;
  if (r.reply.source === "none") return <Empty>Quality agent was skipped because there is no draft to check.</Empty>;
  return (
    <div className="space-y-5">
      {review.needsReview && (
        <div className="rounded-xl border border-cat-urgent/40 bg-cat-urgent/10 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-cat-urgent"><AlertTriangle className="h-4 w-4" /> Escalated for manual review</p>
          <ul className="mt-1.5 list-disc pl-6 text-sm">{review.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
      <Section title="Aggregate confidence vs threshold">
        <div className="relative h-3 rounded-full bg-muted">
          <motion.div className={cn("h-full rounded-full", q.aggregate_confidence >= threshold ? "bg-success" : "bg-cat-urgent")} initial={{ width: 0 }} animate={{ width: `${q.aggregate_confidence * 100}%` }} />
          <div className="absolute -top-1 h-5 w-0.5 bg-foreground" style={{ left: `${threshold * 100}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{q.aggregate_confidence.toFixed(2)} aggregate · threshold {threshold.toFixed(2)}</p>
      </Section>
      <Section title="Checks">
        <ul className="space-y-1.5">
          {q.checks.map((c) => (
            <li key={c.name} className="flex items-start gap-2 rounded-lg bg-muted/50 px-2.5 py-2 text-sm">
              {c.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> : <XCircle className="mt-0.5 h-4 w-4 text-cat-urgent" />}
              <div><p className="font-medium">{c.name.replace(/_/g, " ")}</p><p className="text-xs text-muted-foreground">{c.detail}</p></div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

export function AgentPanel({ result, loading, tab, onTab }: { result: ProcessResult | null; loading: boolean; tab: PanelTab; onTab: (t: PanelTab) => void }) {
  const { threshold } = useSettings();
  const review = result ? evaluateReview(result, threshold) : null;
  useEffect(() => {}, [result?.id]);
  return (
    <div id="agent-panel" className="glass rounded-2xl p-4">
      <Tabs value={tab} onValueChange={(v) => onTab(v as PanelTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="triage">Triage</TabsTrigger>
          <TabsTrigger value="context">Context</TabsTrigger>
          <TabsTrigger value="reply">Reply</TabsTrigger>
          <TabsTrigger value="quality" className="gap-1">
            Quality {review?.needsReview && <span className="h-1.5 w-1.5 rounded-full bg-cat-urgent" />}
          </TabsTrigger>
        </TabsList>
        <div className="mt-4 min-h-[300px]">
          {!result ? (
            loading ? (
              <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-8 w-3/4" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-24 w-full" /></div>
            ) : <Empty>Run the pipeline to see each agent's output.</Empty>
          ) : (
            <motion.div key={result.id + tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <TabsContent value="triage" forceMount={tab === "triage" ? true : undefined}><TriageTab r={result} /></TabsContent>
              <TabsContent value="context"><ContextTab r={result} /></TabsContent>
              <TabsContent value="reply"><ReplyTab key={result.id} r={result} locked={!!review?.needsReview} /></TabsContent>
              <TabsContent value="quality"><QualityTab r={result} threshold={threshold} review={review!} /></TabsContent>
            </motion.div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
