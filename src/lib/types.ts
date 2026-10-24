export type Category =
  | "urgent_request"
  | "action_request"
  | "meeting_coordination"
  | "follow_up"
  | "informational"
  | "low_priority";
export type Tone = "formal" | "friendly" | "brief";
export type AgentName = "input" | "triage" | "context" | "reply" | "quality";
export const AGENTS: AgentName[] = ["input", "triage", "context", "reply", "quality"];
export const CATEGORIES: Category[] = [
  "urgent_request",
  "action_request",
  "meeting_coordination",
  "follow_up",
  "informational",
  "low_priority",
];

export interface Health {
  status: "ok";
  ollama: { up: boolean; model: string | null };
  version: string;
}
export interface InboxEmail {
  id: string;
  sender: string;
  subject: string;
  body: string;
  received_at: string;
  label?: { category: Category; urgency: "high" | "low" };
}
export interface ProcessRequest {
  subject?: string;
  body: string;
  use_llm?: boolean;
  tone?: Tone;
  escalation_threshold?: number;
}
export interface Cue {
  text: string;
  start: number;
  end: number;
  kind: "strong" | "weak" | "suppress" | "category";
  weight: number;
}
export interface Deadline {
  phrase: string;
  resolved_date: string | null;
  start: number;
  end: number;
}
export interface Entity {
  text: string;
  type: "person" | "org" | "project" | "email" | "url";
  start: number;
  end: number;
}
export interface Reply {
  draft: string | null;
  tone: string;
  source: "llm" | "template" | "none";
  confidence: number;
}
export interface QualityCheck {
  name: "toxicity" | "draft_exists" | "deadline_consistency" | "politeness" | "length";
  passed: boolean;
  detail: string;
}
export interface TraceEntry {
  agent: AgentName;
  status: "done" | "skipped" | "failed";
  started_ms: number;
  duration_ms: number;
  used_llm: boolean;
  model: string | null;
  message: string;
}
export interface ProcessResult {
  id: string;
  input: { subject: string | null; raw: string };
  valid: boolean;
  rejection_reason: string | null;
  input_agent: {
    cleaned: string;
    salutation: string;
    body: string;
    closing: string;
    quoted_ratio: number;
    quoted_stripped: boolean;
    confidence: number;
  };
  triage: {
    category: Category;
    urgency_score: number;
    high_urgency: boolean;
    confidence: number;
    llm_disambiguated: boolean;
    cues: Cue[];
  };
  context: {
    deadlines: Deadline[];
    entities: Entity[];
    actions: string[];
    questions: string[];
    summary: string;
    confidence: number;
  };
  reply: Reply;
  quality: {
    checks: QualityCheck[];
    aggregate_confidence: number;
    threshold: number;
    needs_manual_review: boolean;
    escalation_reasons: string[];
  };
  duplicate: { is_duplicate: boolean; similarity: number; matched_id: string | null };
  trace: TraceEntry[];
  total_ms: number;
}
export interface BenchmarkReport {
  n: number;
  reference_date: string;
  llm_used: boolean;
  triage_accuracy: number;
  urgency_accuracy: number;
  deadline_precision: number;
  deadline_recall: number;
  entity_precision: number;
  entity_recall: number;
  reply_relevance_mean: number;
  reply_relevance_dist: { good: number; acceptable: number; poor: number; none: number };
  escalation_rate: number;
  duplicate_handling_rate: number;
  explainability_score: number;
  latency_ms: { mean: number; median: number; p95: number };
  confusion: { labels: string[]; matrix: number[][] };
  per_email: {
    id: string;
    expected_category: string;
    predicted_category: string;
    expected_urgency: string;
    predicted_urgency: string;
    correct: boolean;
  }[];
}
export interface ServerSettings {
  use_llm: boolean;
  escalation_threshold: number;
  ollama_model: string;
  reference_date: string;
}
export type StreamEvent =
  | { event: "agent_start"; data: { agent: AgentName } }
  | { event: "agent_done"; data: { agent: AgentName; trace: TraceEntry; output: unknown } }
  | { event: "complete"; data: { result: ProcessResult } }
  | { event: "error"; data: { message: string } };
