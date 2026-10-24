import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy as CopyIcon, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PipelineStrip } from "@/components/ip/PipelineStrip";
import { AgentPanel, type PanelTab } from "@/components/ip/AgentPanel";
import { HighlightedText, Legend } from "@/components/ip/EmailText";
import { usePipeline } from "@/hooks/use-pipeline";
import { COMPOSE_PRESETS } from "@/lib/mock";
import { scrollToAgent } from "./index";

export const Route = createFileRoute("/compose")({
  head: () => ({
    meta: [
      { title: "Compose & Test · InboxPilot" },
      { name: "description", content: "Paste any email and watch the five InboxPilot agents process it live." },
      { property: "og:title", content: "Compose & Test · InboxPilot" },
      { property: "og:description", content: "Try the five-agent triage pipeline on your own email text." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Compose,
});

function Compose() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tab, setTab] = useState<PanelTab>("triage");
  const p = usePipeline();
  const run = () => p.run({ subject: subject || undefined, body });

  return (
    <div className="space-y-4">
      <PipelineStrip nodes={p.nodes} result={p.result} onSelect={(a) => scrollToAgent(a, setTab)} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
        <section id="email-view" className="glass space-y-3 rounded-2xl p-5">
          <h1 className="text-lg font-semibold tracking-tight">Compose & Test</h1>
          <div className="flex flex-wrap gap-2">
            {COMPOSE_PRESETS.map((x) => (
              <button key={x.label} onClick={() => (setSubject(x.subject), setBody(x.body))} className="rounded-full border px-3 py-1 text-xs hover:bg-accent">
                {x.label}
              </button>
            ))}
          </div>
          <Input placeholder="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-xl" />
          <Textarea placeholder="Paste or write an email body…" rows={9} value={body} onChange={(e) => setBody(e.target.value)} className="rounded-xl" />
          <div className="flex items-center gap-3">
            <Button onClick={run} disabled={!body.trim() || p.running} className="bg-brand">
              <Play className="mr-1.5 h-4 w-4" /> {p.running ? "Running…" : "Run pipeline"}
            </Button>
            <span className="text-xs text-muted-foreground">{body.length} characters</span>
          </div>
          {p.result && !p.result.valid && <p className="text-sm text-destructive">{p.result.rejection_reason}</p>}
          {p.result?.duplicate.is_duplicate && (
            <div className="flex items-center gap-2 rounded-xl bg-cat-info/12 px-3 py-2 text-sm">
              <CopyIcon className="h-4 w-4" /> Looks like a duplicate of inbox email <b>{p.result.duplicate.matched_id}</b> ({Math.round(p.result.duplicate.similarity * 100)}% similar).
            </div>
          )}
          {p.result && (
            <div className="space-y-2 rounded-xl bg-background/50 p-4">
              <HighlightedText result={p.result} />
              <Legend />
            </div>
          )}
        </section>
        <AgentPanel result={p.result} loading={p.running} tab={tab} onTab={setTab} />
      </div>
    </div>
  );
}
