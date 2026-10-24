import type { AgentName } from "./types";

export type AgentTab = Exclude<AgentName, "input">;

export function scrollToAgent(a: AgentName, setTab: (t: AgentTab) => void) {
  if (a === "input") document.getElementById("email-view")?.scrollIntoView({ behavior: "smooth", block: "start" });
  else {
    setTab(a);
    document.getElementById("agent-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
