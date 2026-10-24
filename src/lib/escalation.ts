import type { ProcessResult } from "./types";

export const THRESHOLD_PREFIX = "Aggregate confidence";

/** Re-evaluates manual review against a (possibly changed) threshold, client-side. */
export function evaluateReview(result: ProcessResult, threshold: number) {
  const agg = result.quality.aggregate_confidence;
  const other = result.quality.escalation_reasons.filter((r) => !r.startsWith(THRESHOLD_PREFIX));
  const below = result.reply.source !== "none" && agg < threshold;
  const reasons = below
    ? [...other, `${THRESHOLD_PREFIX} ${agg.toFixed(2)} is below threshold ${threshold.toFixed(2)}`]
    : other;
  return { needsReview: reasons.length > 0, reasons };
}
