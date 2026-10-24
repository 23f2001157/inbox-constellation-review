import type { StreamEvent } from "./types";

/** Parses complete "event:/data:" blocks from a buffer; returns leftover partial text. */
export function parseSSE(buffer: string): { events: StreamEvent[]; rest: string } {
  const blocks = buffer.split(/\r?\n\r?\n/);
  const rest = blocks.pop() ?? "";
  const events: StreamEvent[] = [];
  for (const block of blocks) {
    let name = "message";
    const data: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("event:")) name = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (!data.length) continue;
    try {
      events.push({ event: name, data: JSON.parse(data.join("\n")) } as StreamEvent);
    } catch {
      /* ignore malformed block */
    }
  }
  return { events, rest };
}
