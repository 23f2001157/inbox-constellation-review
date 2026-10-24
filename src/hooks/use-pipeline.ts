import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getSettings } from "@/lib/store";
import { AGENTS, type AgentName, type ProcessRequest, type ProcessResult, type TraceEntry } from "@/lib/types";

export type NodeStatus = "idle" | "running" | "done" | "skipped" | "failed";
export type NodeState = { status: NodeStatus; trace?: TraceEntry };
const fresh = () => Object.fromEntries(AGENTS.map((a) => [a, { status: "idle" }])) as Record<AgentName, NodeState>;

export function usePipeline() {
  const [nodes, setNodes] = useState(fresh);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const run = useCallback(async (req: ProcessRequest, id?: string) => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    const s = getSettings();
    setNodes(fresh());
    setResult(null);
    setError(null);
    setRunning(true);
    try {
      await api.stream(
        { use_llm: s.useLlm, escalation_threshold: s.threshold, tone: "friendly", ...req },
        (e) => {
          if (c.signal.aborted) return;
          if (e.event === "agent_start") setNodes((n) => ({ ...n, [e.data.agent]: { status: "running" } }));
          else if (e.event === "agent_done")
            setNodes((n) => ({ ...n, [e.data.agent]: { status: e.data.trace.status, trace: e.data.trace } }));
          else if (e.event === "complete") {
            setResult(e.data.result);
            setNodes((n) => {
              const next = { ...n };
              e.data.result.trace.forEach((t) => (next[t.agent] = { status: t.status, trace: t }));
              AGENTS.forEach((a) => next[a].status === "idle" && (next[a] = { status: "skipped" }));
              return next;
            });
          } else if (e.event === "error") {
            setError(e.data.message);
            toast.error(e.data.message);
          }
        },
        c.signal,
        id,
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
        toast.error("Pipeline failed", { description: (err as Error).message });
      }
    } finally {
      if (ctrl.current === c) setRunning(false);
    }
  }, []);

  return { nodes, result, setResult, running, error, run };
}
