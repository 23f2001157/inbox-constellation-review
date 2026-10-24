import type { AgentName, Category } from "./types";

export const CATEGORY_META: Record<Category, { label: string; cls: string; bar: string }> = {
  urgent_request: { label: "Urgent", cls: "bg-cat-urgent/12 text-cat-urgent border-cat-urgent/30", bar: "bg-cat-urgent" },
  action_request: { label: "Action", cls: "bg-cat-action/12 text-cat-action border-cat-action/30", bar: "bg-cat-action" },
  meeting_coordination: { label: "Meeting", cls: "bg-cat-meeting/12 text-cat-meeting border-cat-meeting/30", bar: "bg-cat-meeting" },
  follow_up: { label: "Follow-up", cls: "bg-cat-followup/12 text-cat-followup border-cat-followup/30", bar: "bg-cat-followup" },
  informational: { label: "Informational", cls: "bg-cat-info/12 text-cat-info border-cat-info/30", bar: "bg-cat-info" },
  low_priority: { label: "Low priority", cls: "bg-cat-low/12 text-cat-low border-cat-low/30", bar: "bg-cat-low" },
};

export const AGENT_META: Record<AgentName, { label: string; does: string; technique: string; llm: string }> = {
  input: {
    label: "Input",
    does: "Validates the email, strips quoted history and signatures, and splits salutation, body and closing.",
    technique: "Regex line classification and quote-marker detection",
    llm: "Never uses the LLM",
  },
  triage: {
    label: "Triage",
    does: "Assigns one of six categories and an urgency score from weighted cue phrases.",
    technique: "Weighted lexicon with strong, weak and suppressing cues",
    llm: "Optional: LLM breaks ties when rules are unsure",
  },
  context: {
    label: "Context",
    does: "Extracts deadlines (resolved to real dates), people, organisations, projects, actions and questions.",
    technique: "Pattern matching plus relative-date resolution against a reference date",
    llm: "Never uses the LLM",
  },
  reply: {
    label: "Reply",
    does: "Drafts a response in the chosen tone that references the deadline and topic.",
    technique: "Category templates, or a local LLM when enabled",
    llm: "Optional: local Ollama model writes the draft",
  },
  quality: {
    label: "Quality",
    does: "Runs safety and consistency checks and decides whether a human should review.",
    technique: "Rule checks plus aggregate confidence against a threshold",
    llm: "Never uses the LLM",
  },
};

export const pct = (n: number) => `${Math.round(n * 100)}%`;
