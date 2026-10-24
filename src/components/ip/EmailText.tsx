import { Fragment } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { splitQuoted } from "@/lib/mock";
import type { ProcessResult } from "@/lib/types";

type Span = { start: number; end: number; cls: string; tip: string };

const CUE_CLS: Record<string, string> = {
  strong: "bg-cat-urgent/15 text-cat-urgent decoration-cat-urgent",
  weak: "bg-cat-action/15 text-cat-action decoration-cat-action",
  suppress: "bg-muted text-muted-foreground decoration-muted-foreground line-through",
  category: "bg-primary/10 text-primary decoration-primary",
};

export function buildSpans(r: ProcessResult): Span[] {
  const all: Span[] = [
    ...r.context.deadlines.map((d) => ({ start: d.start, end: d.end, cls: "bg-cat-followup/20 text-foreground ring-1 ring-cat-followup/50", tip: `Deadline → ${d.resolved_date ?? "unresolved"}` })),
    ...r.context.entities.map((e) => ({ start: e.start, end: e.end, cls: "bg-cat-meeting/12 text-cat-meeting", tip: `Entity · ${e.type}` })),
    ...r.triage.cues.map((c) => ({ start: c.start, end: c.end, cls: CUE_CLS[c.kind], tip: `${c.kind} cue · weight ${c.weight >= 0 ? "+" : ""}${c.weight.toFixed(2)}` })),
  ].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Span[] = [];
  for (const s of all) if (!out.length || s.start >= out[out.length - 1].end) out.push(s);
  return out;
}

export function HighlightedText({ result }: { result: ProcessResult }) {
  const text = result.input_agent.cleaned;
  const spans = buildSpans(result);
  const parts: React.ReactNode[] = [];
  let i = 0;
  spans.forEach((s, k) => {
    if (s.start > i) parts.push(<Fragment key={`t${k}`}>{text.slice(i, s.start)}</Fragment>);
    parts.push(
      <Tooltip key={`s${k}`}>
        <TooltipTrigger asChild>
          <mark className={cn("cursor-help rounded px-0.5 font-medium", s.cls)}>{text.slice(s.start, s.end)}</mark>
        </TooltipTrigger>
        <TooltipContent>{s.tip}</TooltipContent>
      </Tooltip>,
    );
    i = s.end;
  });
  parts.push(<Fragment key="end">{text.slice(i)}</Fragment>);
  return <div className="whitespace-pre-wrap text-[15px] leading-7">{parts}</div>;
}

export function RawText({ raw }: { raw: string }) {
  return (
    <div className="whitespace-pre-wrap font-mono text-[13px] leading-6">
      {splitQuoted(raw).map((l, i) => (
        <div key={i} className={cn(l.quoted && "text-muted-foreground line-through")}>
          {l.line || "\u00a0"}
        </div>
      ))}
    </div>
  );
}

export function Legend() {
  const items = [
    ["Strong cue", "bg-cat-urgent/15"],
    ["Weak cue", "bg-cat-action/15"],
    ["Category cue", "bg-primary/10"],
    ["Suppressor", "bg-muted"],
    ["Deadline", "bg-cat-followup/20"],
    ["Entity", "bg-cat-meeting/12"],
  ];
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
      {items.map(([l, c]) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-sm", c)} /> {l}
        </span>
      ))}
    </div>
  );
}
