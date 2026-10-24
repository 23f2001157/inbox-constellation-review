import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, Play, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CategoryBadge } from "@/components/ip/primitives";
import { api } from "@/lib/api";
import { useSettings } from "@/lib/store";
import type { BenchmarkReport, Category } from "@/lib/types";
import { CATEGORY_META, pct } from "@/lib/ui";

export const Route = createFileRoute("/benchmark")({
  head: () => ({
    meta: [
      { title: "Benchmark · InboxPilot" },
      { name: "description", content: "Accuracy, extraction precision/recall, reply relevance and latency for the InboxPilot agents." },
      { property: "og:title", content: "Benchmark · InboxPilot" },
      { property: "og:description", content: "Measure triage accuracy, extraction quality and latency on the labelled inbox." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Benchmark,
});

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Confusion({ c }: { c: BenchmarkReport["confusion"] }) {
  const max = Math.max(1, ...c.matrix.flat());
  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="p-1 text-left text-muted-foreground">expected ↓ / predicted →</th>
            {c.labels.map((l) => <th key={l} className="p-1 font-medium">{CATEGORY_META[l as Category]?.label ?? l}</th>)}
          </tr>
        </thead>
        <tbody>
          {c.matrix.map((row, i) => (
            <tr key={i}>
              <td className="p-1 pr-2 font-medium">{CATEGORY_META[c.labels[i] as Category]?.label ?? c.labels[i]}</td>
              {row.map((v, j) => (
                <td key={j} className="p-0.5">
                  <div
                    className={`grid h-10 w-14 place-items-center rounded-lg font-semibold ${i === j ? "bg-primary text-primary-foreground" : v ? "bg-cat-urgent text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    style={{ opacity: v ? 0.35 + 0.65 * (v / max) : 1 }}
                  >
                    {v}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Benchmark() {
  const s = useSettings();
  const qc = useQueryClient();
  const key = ["benchmark", s.useMock, s.useLlm];
  const q = useQuery({ queryKey: key, queryFn: api.benchmark });
  const run = useMutation({
    mutationFn: api.runBenchmark,
    onSuccess: (d) => {
      qc.setQueryData(key, d);
      toast.success(`Benchmark complete on ${d.n} emails`);
    },
    onError: (e) => toast.error("Benchmark failed", { description: (e as Error).message }),
  });
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect">("all");
  const d = q.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Benchmark</h1>
          <p className="text-sm text-muted-foreground">{d ? `${d.n} labelled emails · reference date ${d.reference_date} · ${d.llm_used ? "LLM on" : "rules only"}` : "Loading last run…"}</p>
        </div>
        <Button onClick={() => run.mutate()} disabled={run.isPending} className="bg-brand">
          <Play className="mr-1.5 h-4 w-4" /> {run.isPending ? "Running…" : "Run benchmark"}
        </Button>
      </div>
      {!d ? (
        <div className="grid gap-3 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="Triage accuracy" value={pct(d.triage_accuracy)} />
            <Metric label="Urgency accuracy" value={pct(d.urgency_accuracy)} />
            <Metric label="Deadline P / R" value={`${pct(d.deadline_precision)} / ${pct(d.deadline_recall)}`} />
            <Metric label="Entity P / R" value={`${pct(d.entity_precision)} / ${pct(d.entity_recall)}`} />
            <Metric label="Reply relevance" value={d.reply_relevance_mean.toFixed(2)} hint="automated rubric" />
            <Metric label="Escalation rate" value={pct(d.escalation_rate)} />
            <Metric label="Duplicate handling" value={pct(d.duplicate_handling_rate)} />
            <Metric label="Mean latency" value={`${d.latency_ms.mean} ms`} hint={`median ${d.latency_ms.median} · p95 ${d.latency_ms.p95}`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass rounded-2xl p-4">
              <h3 className="mb-3 text-sm font-semibold">Reply relevance distribution <span className="font-normal text-muted-foreground">(automated rubric)</span></h3>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={Object.entries(d.reply_relevance_dist).map(([k, v]) => ({ k, v }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="k" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                    <Bar dataKey="v" name="emails" radius={[8, 8, 0, 0]}>
                      {["var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"].map((c) => <Cell key={c} fill={c} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass rounded-2xl p-4">
              <h3 className="mb-3 text-sm font-semibold">Category confusion matrix</h3>
              <Confusion c={d.confusion} />
            </div>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Per-email results</h3>
              <ToggleGroup type="single" size="sm" value={filter} onValueChange={(v) => v && setFilter(v as typeof filter)}>
                <ToggleGroupItem value="all">All</ToggleGroupItem>
                <ToggleGroupItem value="correct">Correct</ToggleGroupItem>
                <ToggleGroupItem value="incorrect">Incorrect</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Email</TableHead><TableHead>Expected</TableHead><TableHead>Predicted</TableHead><TableHead>Urgency (exp → pred)</TableHead><TableHead>Result</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {d.per_email.filter((p) => filter === "all" || (filter === "correct") === p.correct).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id}</TableCell>
                    <TableCell><CategoryBadge category={p.expected_category as Category} /></TableCell>
                    <TableCell><CategoryBadge category={p.predicted_category as Category} /></TableCell>
                    <TableCell className="text-xs">{p.expected_urgency} → {p.predicted_urgency}</TableCell>
                    <TableCell>{p.correct ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-cat-urgent" />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
