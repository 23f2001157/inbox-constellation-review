import { Bot, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_META } from "@/lib/ui";
import type { Category } from "@/lib/types";

export function CategoryBadge({ category, className }: { category: Category; className?: string }) {
  const m = CATEGORY_META[category];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", m.cls, className)}>
      {m.label}
    </span>
  );
}

export function ConfidenceRing({ value, size = 36, stroke = 4, label = true }: { value: number; size?: number; stroke?: number; label?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
          className="fill-none stroke-primary transition-all duration-700"
        />
      </svg>
      {label && <span className="absolute text-[10px] font-semibold tabular-nums">{Math.round(value * 100)}</span>}
    </div>
  );
}

export function UrgencyBar({ value, className }: { value: number; className?: string }) {
  const color = value >= 0.6 ? "bg-cat-urgent" : value >= 0.35 ? "bg-cat-followup" : "bg-cat-low";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.max(4, value * 100)}%` }} />
    </div>
  );
}

export function UrgencyGauge({ value }: { value: number }) {
  const angle = -90 + value * 180;
  return (
    <div className="relative h-20 w-36">
      <svg viewBox="0 0 120 64" className="h-full w-full">
        <path d="M10 60 A50 50 0 0 1 110 60" strokeWidth="10" strokeLinecap="round" className="fill-none stroke-muted" />
        <path
          d="M10 60 A50 50 0 0 1 110 60"
          strokeWidth="10"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${value * 100} 100`}
          className={cn("fill-none transition-all duration-700", value >= 0.6 ? "stroke-cat-urgent" : value >= 0.35 ? "stroke-cat-followup" : "stroke-cat-low")}
        />
        <line x1="60" y1="60" x2="60" y2="22" strokeWidth="3" strokeLinecap="round" className="stroke-foreground transition-transform duration-700" style={{ transform: `rotate(${angle}deg)`, transformOrigin: "60px 60px" }} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center text-sm font-semibold tabular-nums">{value.toFixed(2)}</div>
    </div>
  );
}

export function SourceBadge({ llm, model }: { llm: boolean; model?: string | null }) {
  return (
    <span
      title={model ?? undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        llm ? "bg-brand text-primary-foreground" : "bg-secondary text-secondary-foreground",
      )}
    >
      {llm ? <Bot className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
      {llm ? "LLM" : "Rules"}
    </span>
  );
}
