import { describe, expect, it } from "vitest";
import { parseSSE } from "@/lib/sse";
import { evaluateReview } from "@/lib/escalation";
import { analyze } from "@/lib/mock";

describe("parseSSE", () => {
  it("parses complete blocks and keeps the partial remainder", () => {
    const { events, rest } = parseSSE(
      'event: agent_start\ndata: {"agent":"input"}\n\nevent: agent_start\ndata: {"ag',
    );
    expect(events).toEqual([{ event: "agent_start", data: { agent: "input" } }]);
    expect(rest).toBe('event: agent_start\ndata: {"ag');
  });
});

describe("escalation threshold", () => {
  const r = analyze({ body: "Hi team, please review the Q4 budget for Acme Corp by Friday. Thanks, Priya" });
  it("flags review when aggregate confidence is below threshold", () => {
    expect(evaluateReview(r, r.quality.aggregate_confidence + 0.01).needsReview).toBe(true);
  });
  it("clears review when threshold drops below aggregate", () => {
    expect(evaluateReview(r, 0.1).needsReview).toBe(false);
  });
});
