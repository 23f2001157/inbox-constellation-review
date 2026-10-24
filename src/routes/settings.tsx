import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/ip/AppShell";
import { api, API_URL } from "@/lib/api";
import { setSettings, useSettings } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · InboxPilot" },
      { name: "description", content: "Configure the local LLM, escalation threshold, theme and data source for InboxPilot." },
      { property: "og:title", content: "Settings · InboxPilot" },
      { property: "og:description", content: "Tune InboxPilot's local LLM and escalation behaviour." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b py-4 last:border-0">
      <div className="max-w-md"><p className="font-medium">{title}</p><p className="text-sm text-muted-foreground">{desc}</p></div>
      {children}
    </div>
  );
}

function SettingsPage() {
  const s = useSettings();
  const health = useQuery({ queryKey: ["health", s.useMock], queryFn: api.health, refetchInterval: 10000 });
  const up = !!health.data?.ollama.up && !(s.backendOffline && !s.useMock);
  useEffect(() => {
    const t = setTimeout(() => {
      api.putSettings({ use_llm: s.useLlm, escalation_threshold: s.threshold, ollama_model: s.ollamaModel, reference_date: s.referenceDate });
    }, 400);
    return () => clearTimeout(t);
  }, [s.useLlm, s.threshold, s.ollamaModel, s.referenceDate]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <div className="glass rounded-2xl px-5">
        <Row title="Use local LLM (Ollama)" desc="Lets Triage break ties and Reply write drafts with a local model.">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("h-2.5 w-2.5 rounded-full", health.isLoading ? "animate-pulse bg-muted-foreground" : up ? "bg-success" : "bg-cat-urgent")} />
              {health.isLoading ? "checking…" : up ? `${health.data?.ollama.model} online` : "offline"}
            </span>
            <Switch checked={s.useLlm} onCheckedChange={(v) => setSettings({ useLlm: v })} />
          </div>
        </Row>
        <Row title="Escalation threshold" desc="Drafts with aggregate confidence below this go to manual review. Applies instantly and on the next run.">
          <div className="flex w-64 items-center gap-3">
            <Slider min={0.1} max={0.9} step={0.05} value={[s.threshold]} onValueChange={([v]) => setSettings({ threshold: Math.round(v * 100) / 100 })} />
            <span className="w-10 text-right font-mono text-sm">{s.threshold.toFixed(2)}</span>
          </div>
        </Row>
        <Row title="Reference date" desc="Relative deadlines like “by Friday” are resolved against this date.">
          <span className="rounded-lg bg-muted px-3 py-1 font-mono text-sm">{s.referenceDate}</span>
        </Row>
        <Row title="Theme" desc={`Currently ${s.theme} mode.`}><ThemeToggle /></Row>
        <Row title="Use mock data" desc={`Off: calls your local server at ${API_URL}. On: uses built-in sample data.`}>
          <Switch checked={s.useMock} onCheckedChange={(v) => setSettings({ useMock: v, backendOffline: false })} />
        </Row>
      </div>
      <p className="text-xs text-muted-foreground">Server version: {health.data?.version ?? "unknown"}</p>
    </div>
  );
}
