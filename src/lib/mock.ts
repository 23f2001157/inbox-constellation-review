import type {
  AgentName,
  BenchmarkReport,
  Category,
  Cue,
  Deadline,
  Entity,
  InboxEmail,
  ProcessResult,
  QualityCheck,
  Reply,
  StreamEvent,
  Tone,
  TraceEntry,
} from "./types";
import { CATEGORIES } from "./types";
import { THRESHOLD_PREFIX } from "./escalation";

export const REFERENCE_DATE = "2026-10-24";
export const MOCK_MODEL = "llama3.1:8b";

export const MOCK_EMAILS: InboxEmail[] = [
  {
    id: "em_001",
    sender: "Priya Raman <priya@northwind.io>",
    subject: "URGENT: checkout API is down in production",
    body: "Hi Aravindh,\n\nThe checkout API is down in production and customers can't pay. This is critical and blocking all orders for Northwind. Can you look at it immediately? We need a fix before end of day.\n\nLogs are here: https://status.northwind.io/incident/482\n\nThanks,\nPriya",
    received_at: "2026-10-24T08:12:00Z",
    label: { category: "urgent_request", urgency: "high" },
  },
  {
    id: "em_002",
    sender: "Marcus Lee <marcus@globex.com>",
    subject: "Project Atlas kickoff — find a slot?",
    body: "Hello,\n\nCould we schedule a 30-minute call to kick off Project Atlas with the Globex team? I'm free Tuesday or Wednesday afternoon. Please send a calendar invite for whichever slot works.\n\nWhat time zone are you in?\n\nBest,\nMarcus",
    received_at: "2026-10-24T07:40:00Z",
    label: { category: "meeting_coordination", urgency: "low" },
  },
  {
    id: "em_003",
    sender: "Acme Corp Digest <news@acme.com>",
    subject: "Acme monthly newsletter — October release notes",
    body: "Hi there,\n\nFYI, here is the October newsletter with release notes for Acme Corp. No action needed. Highlights include faster dashboards and a new export format. Read more at https://acme.com/blog/october.\n\nCheers,\nThe Acme team",
    received_at: "2026-10-23T18:00:00Z",
    label: { category: "informational", urgency: "low" },
  },
  {
    id: "em_004",
    sender: "Daniel Kim <daniel@initech.co>",
    subject: "Following up - any update?",
    body: "Hi,\n\nJust following up on this. Any update?\n\nDaniel",
    received_at: "2026-10-23T16:25:00Z",
    label: { category: "follow_up", urgency: "low" },
  },
  {
    id: "em_005",
    sender: "Priya Raman <priya@northwind.io>",
    subject: "Re: URGENT: checkout API is down in production",
    body: "Hi Aravindh,\n\nThe checkout API is down in production and customers can't pay. This is critical and blocking all orders for Northwind. Can you look at it immediately? We need a fix before end of day.\n\nThanks,\nPriya",
    received_at: "2026-10-24T08:20:00Z",
    label: { category: "urgent_request", urgency: "high" },
  },
  {
    id: "em_006",
    sender: "Sarah Chen <sarah.chen@initech.co>",
    subject: "Contract review for Initech renewal",
    body: "Hi Aravindh,\n\nPlease review the attached renewal contract for Initech and send me your comments by Friday. Legal wants to sign it next week. Can you also confirm the pricing table on page 4 is correct?\n\nThank you,\nSarah Chen",
    received_at: "2026-10-23T11:05:00Z",
    label: { category: "action_request", urgency: "low" },
  },
  {
    id: "em_007",
    sender: "Gadget Outlet <deals@gadgetoutlet.shop>",
    subject: "Weekend sale: 40% off headphones",
    body: "Hey!\n\nOur weekend sale is live: 40% off headphones and a limited time discount on chargers. No rush, the promo runs until Sunday. Unsubscribe at https://gadgetoutlet.shop/unsub.\n\nCheers,\nGadget Outlet",
    received_at: "2026-10-23T09:00:00Z",
    label: { category: "low_priority", urgency: "low" },
  },
  {
    id: "em_008",
    sender: "Elena Petrova <elena@globex.com>",
    subject: "Re: October invoice",
    body: "Hi Marcus,\n\nCould you send over the signed October invoice by Friday? Finance at Globex needs it to close the books this week.\n\nThanks,\nElena\n\nOn Tue, Oct 20, 2026 at 9:14 AM Marcus wrote:\n> Hi Elena, the invoice is attached.\n> Let me know if anything is missing.\n> Best, Marcus",
    received_at: "2026-10-22T14:30:00Z",
    label: { category: "action_request", urgency: "low" },
  },
];

export const COMPOSE_PRESETS: { label: string; subject: string; body: string }[] = [
  {
    label: "Server outage",
    subject: "Database is down",
    body: "Hi team,\n\nThe reporting database is down and the finance dashboards are blocked. This is urgent, please restart it ASAP. We present to the board tomorrow.\n\nThanks,\nTom",
  },
  {
    label: "Meeting request",
    subject: "Sync on Project Orion",
    body: "Hello,\n\nCan we schedule a call on Thursday to review Project Orion milestones? Please send an invite with a slot that works for you.\n\nBest,\nElena",
  },
  {
    label: "Vague follow-up",
    subject: "Following up",
    body: "Hi,\n\nCircling back on this. Any update?\n\nThanks",
  },
  {
    label: "Newsletter",
    subject: "Weekly digest",
    body: "Hi,\n\nFYI, this week's digest is out with release notes and team announcements. No action needed.\n\nCheers,\nAcme Corp",
  },
];

type Lex = { re: RegExp; kind: Cue["kind"]; weight: number; cat?: Category };
const LEXICON: Lex[] = [
  { re: /\b(urgent(?:ly)?)\b/gi, kind: "strong", weight: 0.35 },
  { re: /\b(asap|immediately|right away)\b/gi, kind: "strong", weight: 0.3 },
  { re: /\b(critical|outage|is down|blocking|blocked)\b/gi, kind: "strong", weight: 0.25 },
  { re: /\b(soon|when you get a chance|please)\b/gi, kind: "weak", weight: 0.06 },
  { re: /\b(no rush|fyi|no action needed|whenever)\b/gi, kind: "suppress", weight: -0.2 },
  { re: /\b(schedule|call|calendar|invite|slot|kick off|meeting)\b/gi, kind: "category", weight: 0, cat: "meeting_coordination" },
  { re: /\b(following up|follow up|any update|checking in|circling back)\b/gi, kind: "category", weight: 0, cat: "follow_up" },
  { re: /\b(newsletter|digest|release notes|announcements?)\b/gi, kind: "category", weight: 0, cat: "informational" },
  { re: /\b(sale|discount|promo|limited time|unsubscribe)\b/gi, kind: "category", weight: 0, cat: "low_priority" },
  { re: /\b(review|send|sign|confirm|approve|submit)\b/gi, kind: "category", weight: 0, cat: "action_request" },
];

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const ORGS = ["Northwind", "Globex", "Acme Corp", "Initech", "Gadget Outlet", "Finance"];
const PEOPLE = ["Priya", "Marcus", "Sarah Chen", "Daniel", "Elena", "Tom", "Aravindh"];

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function resolveDeadline(phrase: string, ref: string): string | null {
  const p = phrase.toLowerCase();
  const refDow = new Date(ref + "T00:00:00Z").getUTCDay();
  if (/today|tonight|end of (the )?day|eod/.test(p)) return ref;
  if (p.includes("tomorrow")) return addDays(ref, 1);
  if (/end of (the )?week|this week/.test(p)) return addDays(ref, (5 - refDow + 7) % 7 || 7);
  if (p.includes("next week")) return addDays(ref, ((1 - refDow + 7) % 7) || 7);
  const day = DAYS.findIndex((d) => p.includes(d));
  if (day >= 0) return addDays(ref, ((day - refDow + 7) % 7) || 7);
  return null;
}

function findAll(text: string, re: RegExp) {
  const out: { text: string; start: number; end: number }[] = [];
  for (const m of text.matchAll(re)) out.push({ text: m[0], start: m.index!, end: m.index! + m[0].length });
  return out;
}
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const r2 = (n: number) => Math.round(n * 100) / 100;
function words(s: string) {
  return new Set(s.toLowerCase().match(/[a-z0-9']+/g) ?? []);
}
function jaccard(a: string, b: string) {
  const A = words(a), B = words(b);
  let i = 0;
  A.forEach((w) => B.has(w) && i++);
  return i / (A.size + B.size - i || 1);
}

export function isQuotedLine(line: string, afterMarker: boolean) {
  return afterMarker || line.trim().startsWith(">") || /^On .+wrote:\s*$/.test(line.trim());
}
export function splitQuoted(raw: string) {
  let marker = false;
  return raw.split("\n").map((line) => {
    if (/^On .+wrote:\s*$/.test(line.trim())) marker = true;
    return { line, quoted: isQuotedLine(line, marker) };
  });
}

export function draftReply(
  category: Category,
  tone: Tone,
  ctx: { name: string | null; deadline: Deadline | null; topic: string; vague: boolean },
  llm: boolean,
): Reply {
  if (category === "informational") return { draft: null, tone, source: "none", confidence: 0 };
  const hi = tone === "formal" ? `Dear ${ctx.name ?? "colleague"},` : tone === "friendly" ? `Hi ${ctx.name ?? "there"}!` : `Hi ${ctx.name ?? ""}`.trim() + ",";
  const sign = tone === "formal" ? "Kind regards,\nAravindh" : tone === "friendly" ? "Thanks so much,\nAravindh" : "Thanks,\nAravindh";
  const when = ctx.deadline ? ` by ${ctx.deadline.phrase.replace(/^by /i, "")}${ctx.deadline.resolved_date ? ` (${ctx.deadline.resolved_date})` : ""}` : "";
  const core: Record<Category, Record<Tone, string>> = {
    urgent_request: {
      formal: `Thank you for flagging this. I am treating ${ctx.topic} as a top priority and will share an update${when || " shortly"}.`,
      friendly: `Thanks for the heads-up! I'm jumping on ${ctx.topic} right now and will keep you posted${when || " soon"}.`,
      brief: `On it. Update on ${ctx.topic}${when || " shortly"}.`,
    },
    action_request: {
      formal: `Thank you for your message. I will take care of ${ctx.topic}${when || " as soon as possible"} and confirm once complete.`,
      friendly: `Happy to help with ${ctx.topic}! I'll get it done${when || " soon"} and let you know.`,
      brief: `Will handle ${ctx.topic}${when}.`,
    },
    meeting_coordination: {
      formal: `Thank you for reaching out. I would be glad to meet regarding ${ctx.topic}. Please find my availability in the invite I will send${when || " shortly"}.`,
      friendly: `Sounds great, happy to meet about ${ctx.topic}! I'll send over an invite with a slot${when || " soon"}.`,
      brief: `Works for me. Invite for ${ctx.topic} coming${when}.`,
    },
    follow_up: {
      formal: ctx.vague
        ? "Thank you for following up. Could you please remind me which request this refers to, so I can provide an accurate update?"
        : `Thank you for following up on ${ctx.topic}. I will send a full update${when || " shortly"}.`,
      friendly: ctx.vague
        ? "Thanks for checking in! Could you remind me which thread this is about? Happy to give an update."
        : `Thanks for the nudge on ${ctx.topic}! Update coming${when || " soon"}.`,
      brief: ctx.vague ? "Thanks. Which request is this about?" : `Update on ${ctx.topic}${when || " soon"}.`,
    },
    informational: { formal: "", friendly: "", brief: "" },
    low_priority: {
      formal: "Thank you for the information. I will review it when time permits.",
      friendly: "Thanks for sharing! I'll take a look when I get a chance.",
      brief: "Thanks, noted.",
    },
  };
  const draft = `${hi}\n\n${core[category][tone]}\n\n${sign}`;
  const base = ctx.vague ? 0.3 : category === "low_priority" ? 0.65 : 0.74;
  return { draft, tone, source: llm ? "llm" : "template", confidence: r2(clamp(base + (llm ? 0.1 : 0))) };
}

export interface AnalyzeOptions {
  subject?: string;
  body: string;
  id?: string;
  useLlm?: boolean;
  tone?: Tone;
  threshold?: number;
  referenceDate?: string;
  pool?: { id: string; body: string }[];
}

export function analyze(o: AnalyzeOptions): ProcessResult {
  const raw = o.body;
  const tone = o.tone ?? "friendly";
  const threshold = o.threshold ?? 0.5;
  const ref = o.referenceDate ?? REFERENCE_DATE;
  const llm = !!o.useLlm;
  const id = o.id ? `res_${o.id}` : `res_${hash(raw + (o.subject ?? ""))}`;

  const lines = splitQuoted(raw);
  const cleaned = lines.filter((l) => !l.quoted).map((l) => l.line).join("\n").trim();
  const quotedChars = lines.filter((l) => l.quoted).reduce((n, l) => n + l.line.length + 1, 0);
  const valid = cleaned.length >= 8;
  const parts = cleaned.split("\n").filter((l) => l.trim());
  const salutation = /^(hi|hello|dear|hey)\b/i.test(parts[0] ?? "") ? parts[0] : "";
  const ci = parts.findIndex((l, i) => i > 0 && /^(thanks|thank you|best|regards|cheers|kind regards)\b/i.test(l));
  const closing = ci >= 0 ? parts.slice(ci).join("\n") : "";
  const bodyText = parts.slice(salutation ? 1 : 0, ci >= 0 ? ci : undefined).join("\n");

  // Triage
  const cues: Cue[] = [];
  const catHits: Partial<Record<Category, number>> = {};
  for (const lx of LEXICON) {
    for (const m of findAll(cleaned, lx.re)) {
      cues.push({ ...m, kind: lx.kind, weight: lx.weight });
      if (lx.cat) catHits[lx.cat] = (catHits[lx.cat] ?? 0) + 1;
    }
  }
  cues.sort((a, b) => a.start - b.start);
  const strong = cues.filter((c) => c.kind === "strong").reduce((s, c) => s + c.weight, 0);

  // Context
  const deadlines: Deadline[] = findAll(
    cleaned,
    /\b((?:by |before |on |until )?(?:end of (?:the )?day|eod|today|tonight|tomorrow|end of (?:the )?week|this week|next week|(?:next )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)))\b/gi,
  ).map((m) => ({ phrase: m.text, resolved_date: resolveDeadline(m.text, ref), start: m.start, end: m.end }));
  const entities: Entity[] = [];
  const push = (list: ReturnType<typeof findAll>, type: Entity["type"]) =>
    list.forEach((m) => {
      if (!entities.some((e) => m.start < e.end && m.end > e.start)) entities.push({ ...m, type });
    });
  push(findAll(cleaned, /https?:\/\/[^\s)]+[^\s).,]/g), "url");
  push(findAll(cleaned, /[\w.+-]+@[\w-]+\.[\w.]+\w/g), "email");
  push(findAll(cleaned, /\bProject [A-Z][a-z]+\b/g), "project");
  ORGS.forEach((o2) => push(findAll(cleaned, new RegExp(`\\b${o2}\\b`, "g")), "org"));
  PEOPLE.forEach((p) => push(findAll(cleaned, new RegExp(`\\b${p}\\b`, "g")), "person"));
  entities.sort((a, b) => a.start - b.start);
  const sentences = bodyText.split(/(?<=[.?!])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const questions = sentences.filter((s) => s.endsWith("?"));
  const actions = sentences
    .filter((s) => /\b(please|could you|can you|need|send|review|confirm)\b/i.test(s))
    .map((s) => s.replace(/^(please|could you|can you)\s+/i, "").replace(/[?.]$/, ""))
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  let category: Category;
  let tConf: number;
  if (strong >= 0.3) [category, tConf] = ["urgent_request", 0.9];
  else if (catHits.meeting_coordination) [category, tConf] = ["meeting_coordination", 0.86];
  else if (catHits.follow_up) [category, tConf] = ["follow_up", 0.78];
  else if (catHits.low_priority) [category, tConf] = ["low_priority", 0.84];
  else if (catHits.informational) [category, tConf] = ["informational", 0.88];
  else if (catHits.action_request || questions.length) [category, tConf] = ["action_request", 0.72];
  else [category, tConf] = ["informational", 0.55];
  const ambiguous = tConf < 0.75;
  if (llm && ambiguous) tConf += 0.12;
  const nearDeadline = deadlines.some((d) => d.resolved_date && d.resolved_date <= addDays(ref, 1));
  const urgency = r2(clamp(0.12 + cues.reduce((s, c) => s + (c.kind === "category" ? 0 : c.weight), 0) + (nearDeadline ? 0.15 : 0)));

  const people = entities.filter((e) => e.type === "person" && e.text !== "Aravindh");
  const sender = closing.split("\n").slice(1).join(" ").trim() || people.at(-1)?.text || null;
  const vague = category === "follow_up" && entities.length === 0 && deadlines.length === 0;
  let cConf = vague ? 0.3 : clamp(0.5 + 0.1 * Math.min(3, entities.length) + (deadlines.length ? 0.1 : 0) + (actions.length ? 0.1 : 0), 0, 0.95);
  if (llm && !vague) cConf = clamp(cConf + 0.04);
  const topicEnt = entities.find((e) => e.type === "project" || e.type === "org");
  const subj = (o.subject ?? "").replace(/^(re|fwd?):\s*/i, "").replace(/^urgent:\s*/i, "");
  const topic = topicEnt ? `the ${topicEnt.text} request` : subj ? `"${subj}"` : "your request";
  const summary = vague
    ? "Sender is following up without referencing the original request."
    : `${sender ?? "Sender"} ${category === "meeting_coordination" ? "wants to schedule a meeting" : category === "urgent_request" ? "reports an urgent issue" : category === "informational" ? "shares an update" : category === "low_priority" ? "sent a promotional message" : "asks for action"}${topicEnt ? ` about ${topicEnt.text}` : ""}${deadlines[0] ? `, due ${deadlines[0].resolved_date ?? deadlines[0].phrase}` : ""}.`;

  const iConf = cleaned.length < 80 ? 0.7 : 0.95;
  const reply = draftReply(category, tone, { name: sender?.split(" ")[0] ?? null, deadline: deadlines[0] ?? null, topic, vague }, llm);
  const skipped = reply.source === "none";

  // Quality
  const checks: QualityCheck[] = [];
  let agg = 0;
  const reasons: string[] = [];
  if (!skipped) {
    const d = reply.draft ?? "";
    const dl = deadlines[0];
    const consistent = !dl || (!!dl.resolved_date && d.includes(dl.resolved_date));
    checks.push(
      { name: "toxicity", passed: !/\b(stupid|idiot|useless)\b/i.test(d), detail: "No toxic language detected in the draft" },
      { name: "draft_exists", passed: d.length > 0, detail: d ? "Draft generated" : "No draft produced" },
      { name: "deadline_consistency", passed: consistent, detail: dl ? (consistent ? `Draft references ${dl.resolved_date}` : "Draft omits the resolved deadline") : "No deadlines to check" },
      { name: "politeness", passed: /\b(thank|thanks|please|happy|glad)\b/i.test(d), detail: "Courtesy markers present" },
      { name: "length", passed: d.length >= 40 && d.length <= 900, detail: `${d.length} characters (40–900 allowed)` },
    );
    const failed = checks.filter((c) => !c.passed).length;
    agg = r2(clamp((iConf + tConf + cConf + reply.confidence) / 4 - failed * 0.1));
    if (vague) reasons.push("Follow-up lacks context about the original thread");
    if (agg < threshold) reasons.push(`${THRESHOLD_PREFIX} ${agg.toFixed(2)} is below threshold ${threshold.toFixed(2)}`);
    checks.filter((c) => !c.passed).forEach((c) => reasons.push(`Check failed: ${c.name}`));
  }

  // Duplicate
  let dup = { is_duplicate: false, similarity: 0, matched_id: null as string | null };
  for (const p of o.pool ?? []) {
    const s = r2(jaccard(cleaned, p.body));
    if (s > dup.similarity) dup = { is_duplicate: s >= 0.8, similarity: s, matched_id: s >= 0.8 ? p.id : null };
  }
  if (!dup.is_duplicate) dup.matched_id = null;

  // Trace
  const n = cleaned.length;
  const spec: [AgentName, number, boolean, string][] = [
    ["input", 3 + Math.round(n / 120), false, `Cleaned ${n} chars${quotedChars ? `, stripped ${Math.round((quotedChars / raw.length) * 100)}% quoted history` : ""}`],
    ["triage", llm && ambiguous ? 640 + (n % 200) : 7 + Math.round(n / 90), llm && ambiguous, `${category} (${cues.length} cues)`],
    ["context", 12 + Math.round(n / 60), false, `${deadlines.length} deadlines, ${entities.length} entities`],
    ["reply", skipped ? 0 : llm ? 980 + (n % 400) : 9, llm && !skipped, skipped ? "Skipped: informational mail needs no reply" : `${tone} draft via ${llm ? "LLM" : "template"}`],
    ["quality", skipped ? 0 : 6, false, skipped ? "Skipped: no draft to check" : `aggregate ${agg.toFixed(2)}`],
  ];
  let t = 0;
  const trace: TraceEntry[] = spec.map(([agent, dur, used, message]) => {
    const isSkipped = skipped && (agent === "reply" || agent === "quality");
    const e: TraceEntry = { agent, status: isSkipped ? "skipped" : "done", started_ms: t, duration_ms: dur, used_llm: used, model: used ? MOCK_MODEL : null, message };
    t += dur;
    return e;
  });

  return {
    id,
    input: { subject: o.subject ?? null, raw },
    valid,
    rejection_reason: valid ? null : "Email body is too short to process",
    input_agent: { cleaned, salutation, body: bodyText, closing, quoted_ratio: r2(quotedChars / (raw.length || 1)), quoted_stripped: quotedChars > 0, confidence: iConf },
    triage: { category, urgency_score: urgency, high_urgency: urgency >= 0.6, confidence: r2(tConf), llm_disambiguated: llm && ambiguous, cues },
    context: { deadlines, entities, actions, questions, summary, confidence: r2(cConf) },
    reply,
    quality: { checks, aggregate_confidence: agg, threshold, needs_manual_review: reasons.length > 0, escalation_reasons: reasons },
    duplicate: dup,
    trace,
    total_ms: t,
  };
}

export function poolFor(id?: string) {
  const idx = MOCK_EMAILS.findIndex((e) => e.id === id);
  const list = idx >= 0 ? MOCK_EMAILS.slice(0, idx).filter((e) => e.received_at < MOCK_EMAILS[idx].received_at) : MOCK_EMAILS;
  return list.map((e) => ({ id: e.id, body: splitQuoted(e.body).filter((l) => !l.quoted).map((l) => l.line).join("\n").trim() }));
}

export async function* mockStream(o: AnalyzeOptions, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
  const result = analyze(o);
  const wait = (ms: number) =>
    new Promise<void>((res, rej) => {
      const t = setTimeout(res, ms);
      signal?.addEventListener("abort", () => (clearTimeout(t), rej(new DOMException("aborted", "AbortError"))));
    });
  for (const tr of result.trace) {
    if (tr.status === "skipped") {
      yield { event: "agent_done", data: { agent: tr.agent, trace: tr, output: null } };
      await wait(120);
      continue;
    }
    yield { event: "agent_start", data: { agent: tr.agent } };
    await wait(Math.min(tr.duration_ms, 900) + 280);
    yield { event: "agent_done", data: { agent: tr.agent, trace: tr, output: null } };
  }
  yield { event: "complete", data: { result } };
}

export function mockBenchmark(useLlm: boolean, threshold = 0.5): BenchmarkReport {
  const results = MOCK_EMAILS.map((e) => ({ e, r: analyze({ id: e.id, subject: e.subject, body: e.body, useLlm, threshold, pool: poolFor(e.id) }) }));
  const labels = CATEGORIES as string[];
  const matrix = labels.map(() => labels.map(() => 0));
  const per_email = results.map(({ e, r }) => {
    const exp = e.label!.category, pred = r.triage.category;
    matrix[labels.indexOf(exp)][labels.indexOf(pred)]++;
    const eu = e.label!.urgency, pu = r.triage.high_urgency ? "high" : "low";
    return { id: e.id, expected_category: exp, predicted_category: pred, expected_urgency: eu, predicted_urgency: pu, correct: exp === pred && eu === pu };
  });
  const dist = { good: 0, acceptable: 0, poor: 0, none: 0 };
  let relSum = 0, relN = 0;
  results.forEach(({ r }) => {
    if (r.reply.source === "none") return void dist.none++;
    const c = r.reply.confidence;
    relSum += c; relN++;
    if (c >= 0.75) dist.good++; else if (c >= 0.5) dist.acceptable++; else dist.poor++;
  });
  const lat = results.map(({ r }) => r.total_ms).sort((a, b) => a - b);
  const mean = lat.reduce((a, b) => a + b, 0) / lat.length;
  return {
    n: results.length,
    reference_date: REFERENCE_DATE,
    llm_used: useLlm,
    triage_accuracy: r2(per_email.filter((p) => p.expected_category === p.predicted_category).length / per_email.length),
    urgency_accuracy: r2(per_email.filter((p) => p.expected_urgency === p.predicted_urgency).length / per_email.length),
    deadline_precision: 0.92,
    deadline_recall: 0.88,
    entity_precision: 0.9,
    entity_recall: useLlm ? 0.86 : 0.81,
    reply_relevance_mean: r2(relSum / (relN || 1)),
    reply_relevance_dist: dist,
    escalation_rate: r2(results.filter(({ r }) => r.quality.needs_manual_review).length / results.length),
    duplicate_handling_rate: 1,
    explainability_score: 0.94,
    latency_ms: { mean: Math.round(mean), median: lat[Math.floor(lat.length / 2)], p95: lat[Math.min(lat.length - 1, Math.ceil(lat.length * 0.95) - 1)] },
    confusion: { labels, matrix },
    per_email,
  };
}
