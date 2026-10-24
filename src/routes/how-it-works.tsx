import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Database } from "lucide-react";
import { AGENT_ICON } from "@/components/ip/PipelineStrip";
import { AGENTS, type AgentName } from "@/lib/types";
import { AGENT_META } from "@/lib/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works · InboxPilot" },
      { name: "description", content: "The five InboxPilot agents, the shared state they write to, and how the pipeline degrades gracefully." },
      { property: "og:title", content: "How InboxPilot works" },
      { property: "og:description", content: "An interactive look at the five-agent email triage architecture." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorks,
});

const WRITES: Record<AgentName, string> = {
  input: "input_agent",
  triage: "triage",
  context: "context",
  reply: "reply",
  quality: "quality",
};

function HowItWorks() {
  const [active, setActive] = useState<AgentName>("triage");
  const m = AGENT_META[active];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">How it works</h1>
        <p className="text-sm text-muted-foreground">Five small agents run in order. Each reads the shared state and writes its own section. Hover or click an agent.</p>
      </div>
      <div className="glass rounded-2xl p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          {AGENTS.map((a) => {
            const Icon = AGENT_ICON[a];
            return (
              <button
                key={a}
                onMouseEnter={() => setActive(a)}
                onClick={() => setActive(a)}
                className={cn("rounded-2xl border p-4 text-left transition", active === a ? "border-primary bg-accent shadow-glow" : "hover:bg-accent/50")}
              >
                <span className={cn("grid h-10 w-10 place-items-center rounded-xl", active === a ? "bg-brand text-primary-foreground" : "bg-muted")}>
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-2 font-semibold">{AGENT_META[a].label}</p>
                <p className="text-[11px] text-muted-foreground">writes <code>{WRITES[a]}</code></p>
              </button>
            );
          })}
        </div>
        <div className="relative my-4 hidden h-8 sm:block">
          {AGENTS.map((a, i) => (
            <motion.div
              key={a}
              className={cn("absolute top-0 h-8 w-0.5 rounded", active === a ? "bg-primary" : "bg-border")}
              style={{ left: `${10 + i * 20}%` }}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
          <Database className="h-6 w-6 text-primary" />
          <div>
            <p className="font-semibold">Shared state (ProcessResult)</p>
            <p className="text-xs text-muted-foreground">input · input_agent · triage · context · reply · quality · duplicate · trace</p>
          </div>
        </div>
      </div>
      <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass grid gap-4 rounded-2xl p-5 md:grid-cols-3">
        <div><p className="text-xs font-semibold uppercase text-muted-foreground">What it does</p><p className="mt-1 text-sm">{m.does}</p></div>
        <div><p className="text-xs font-semibold uppercase text-muted-foreground">Technique</p><p className="mt-1 text-sm">{m.technique}</p></div>
        <div><p className="text-xs font-semibold uppercase text-muted-foreground">LLM use</p><p className="mt-1 text-sm">{m.llm}</p></div>
      </motion.div>
      <div className="glass rounded-2xl p-5">
        <h2 className="font-semibold">Graceful degradation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          When triage marks an email as informational, there is nothing to answer, so Reply and Quality are skipped. If the local LLM is off or unreachable, every agent falls back to rules and templates.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {AGENTS.map((a) => {
            const skipped = a === "reply" || a === "quality";
            return (
              <span key={a} className={cn("rounded-full px-3 py-1 text-xs font-medium", skipped ? "border border-dashed text-muted-foreground line-through" : "bg-brand text-primary-foreground")}>
                {AGENT_META[a].label}{skipped && " · skipped"}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
