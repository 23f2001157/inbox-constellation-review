import type { AgentName } from "./types";

export function scrollToAgent<T extends string>(a: AgentName, setTab: (t: T) => void) {
  if (a === "input") document.getElementById("email-view")?.scrollIntoView({ behavior: "smooth", block: "start" });
  else {
    setTab(a as unknown as T);
    document.getElementById("agent-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
