import type {
  BenchmarkReport,
  Health,
  InboxEmail,
  ProcessRequest,
  ProcessResult,
  Reply,
  ServerSettings,
  StreamEvent,
  Tone,
} from "./types";
import { analyze, draftReply, MOCK_EMAILS, mockBenchmark, mockStream, poolFor } from "./mock";
import { parseSSE } from "./sse";
import { getSettings, setSettings } from "./store";

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/** Calls the real backend unless mock mode is on; falls back to mock (with offline banner) on network failure. */
async function realOrMock<T>(real: () => Promise<T>, mock: () => T | Promise<T>): Promise<T> {
  if (getSettings().useMock) {
    await delay(250);
    return mock();
  }
  try {
    const r = await real();
    if (getSettings().backendOffline) setSettings({ backendOffline: false });
    return r;
  } catch {
    setSettings({ backendOffline: true });
    return mock();
  }
}

const opts = (req: ProcessRequest, id?: string) => {
  const s = getSettings();
  return {
    id,
    subject: req.subject,
    body: req.body,
    useLlm: req.use_llm ?? s.useLlm,
    tone: req.tone,
    threshold: req.escalation_threshold ?? s.threshold,
    referenceDate: s.referenceDate,
    pool: poolFor(id),
  };
};

export const api = {
  health: () =>
    realOrMock<Health>(
      () => http("/api/health"),
      () => ({ status: "ok", ollama: { up: true, model: getSettings().ollamaModel }, version: "0.4.0-mock" }),
    ),
  emails: () => realOrMock<InboxEmail[]>(() => http("/api/emails"), () => MOCK_EMAILS),
  process: (req: ProcessRequest, id?: string) =>
    realOrMock<ProcessResult>(
      () => http("/api/process", { method: "POST", body: JSON.stringify(req) }),
      () => analyze(opts(req, id)),
    ),
  batch: (emails: { id?: string; subject?: string; body: string }[]) =>
    realOrMock<{ results: ProcessResult[] }>(
      () => http("/api/batch", { method: "POST", body: JSON.stringify({ emails, use_llm: getSettings().useLlm }) }),
      () => ({ results: emails.map((e) => analyze(opts(e, e.id))) }),
    ),
  regenerate: (result: ProcessResult, tone: Tone) =>
    realOrMock<{ reply: Reply }>(
      () =>
        http("/api/reply/regenerate", {
          method: "POST",
          body: JSON.stringify({ result_id: result.id, body: result.input.raw, tone, use_llm: getSettings().useLlm }),
        }),
      () => {
        const r = analyze({ ...opts({ body: result.input.raw, subject: result.input.subject ?? undefined }), tone });
        return { reply: r.reply.source === "none" ? draftReply("action_request", tone, { name: null, deadline: null, topic: "your note", vague: false }, false) : r.reply };
      },
    ),
  benchmark: () =>
    realOrMock<BenchmarkReport>(() => http("/api/benchmark"), () => mockBenchmark(getSettings().useLlm, getSettings().threshold)),
  runBenchmark: () =>
    realOrMock<BenchmarkReport>(
      () => http("/api/benchmark/run", { method: "POST", body: JSON.stringify({ use_llm: getSettings().useLlm }) }),
      async () => {
        await delay(1400);
        return mockBenchmark(getSettings().useLlm, getSettings().threshold);
      },
    ),
  putSettings: (s: ServerSettings) =>
    getSettings().useMock ? Promise.resolve(s) : http<ServerSettings>("/api/settings", { method: "PUT", body: JSON.stringify(s) }).catch(() => s),

  /** Streams pipeline events. Uses fetch + ReadableStream in real mode, timers in mock mode. */
  async stream(req: ProcessRequest, onEvent: (e: StreamEvent) => void, signal?: AbortSignal, id?: string) {
    const runMock = async () => {
      for await (const e of mockStream(opts(req, id), signal)) onEvent(e);
    };
    if (getSettings().useMock) return runMock();
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/process/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(req),
        signal,
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      setSettings({ backendOffline: false });
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      setSettings({ backendOffline: true });
      return runMock();
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const { events, rest } = parseSSE(buf);
      buf = rest;
      events.forEach(onEvent);
    }
    parseSSE(buf + "\n\n").events.forEach(onEvent);
  },
};
