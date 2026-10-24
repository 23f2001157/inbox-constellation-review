import { motion } from "framer-motion";
import { Check, Inbox, ListChecks, MessageSquareText, ScanSearch, ShieldCheck, Timer, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AGENTS, type AgentName, type ProcessResult } from "@/lib/types";
import { AGENT_META } from "@/lib/ui";
import type { NodeState } from "@/hooks/use-pipeline";
import { ConfidenceRing, SourceBadge } from "./primitives";

export const AGENT_ICON: Record<AgentName, typeof Inbox> = {
  input: Inbox,
  triage: ListChecks,
  context: ScanSearch,
  reply: MessageSquareText,
  quality: ShieldCheck,
};

function confidenceFor(a: AgentName, r: ProcessResult | null) {
  if (!r) return null;
  return { input: r.input_agent.confidence, triage: r.triage.confidence, context: r.context.confidence, reply: r.reply.confidence, quality: r.quality.aggregate_confidence }[a];
}

export function PipelineStrip({
  nodes,
  result,
  onSelect,
}: {
  nodes: Record<AgentName, NodeState>;
  result: ProcessResult | null;
  onSelect: (a: AgentName) => void;
}) {
  return (
    <div className="glass rounded-2xl p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent pipeline</span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
          <Timer className="h-3.5 w-3.5" /> {result ? `${result.total_ms} ms total` : "—"}
        </span>
      </div>
      <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
        {AGENTS.map((a, i) => {
          const n = nodes[a];
          const Icon = AGENT_ICON[a];
          const conf = n.status === "done" ? confidenceFor(a, result) : null;
          return (
            <div key={a} className="flex min-w-[140px] flex-1 items-center">
              <motion.button
                type="button"
                onClick={() => onSelect(a)}
                layout
                className={cn(
                  "relative flex w-full flex-col gap-1.5 rounded-xl border p-2.5 text-left transition-colors hover:bg-accent/60",
                  n.status === "running" && "border-primary shadow-glow",
                  n.status === "done" && "border-primary/30 bg-accent/30",
                  n.status === "skipped" && "border-dashed opacity-50",
                  n.status === "failed" && "border-destructive",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-lg",
                      n.status === "done" ? "bg-brand text-primary-foreground" : "bg-muted text-muted-foreground",
                      n.status === "running" && "animate-pulse bg-primary text-primary-foreground",
                    )}
                  >
                    {n.status === "done" ? <Check className="h-4 w-4" /> : n.status === "failed" ? <X className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="text-sm font-semibold">{AGENT_META[a].label}</span>
                  {conf != null && <span className="ml-auto"><ConfidenceRing value={conf} size={28} stroke={3} /></span>}
                </div>
                <div className="flex h-5 items-center gap-1.5 text-[11px] text-muted-foreground">
                  {n.status === "idle" && "idle"}
                  {n.status === "running" && <span className="font-medium text-primary">running…</span>}
                  {n.status === "skipped" && "skipped"}
                  {n.status === "done" && n.trace && (
                    <>
                      <span className="tabular-nums">{n.trace.duration_ms} ms</span>
                      <SourceBadge llm={n.trace.used_llm} model={n.trace.model} />
                    </>
                  )}
                </div>
              </motion.button>
              {i < AGENTS.length - 1 && (
                <div className="relative mx-1 h-0.5 w-4 shrink-0 overflow-hidden rounded bg-border">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary"
                    animate={{ width: n.status === "done" || n.status === "skipped" ? "100%" : "0%" }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
