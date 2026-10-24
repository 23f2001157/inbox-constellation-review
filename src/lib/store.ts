import { useSyncExternalStore } from "react";
import { REFERENCE_DATE, MOCK_MODEL } from "./mock";

export interface AppSettings {
  theme: "light" | "dark";
  useMock: boolean;
  useLlm: boolean;
  threshold: number;
  referenceDate: string;
  ollamaModel: string;
  backendOffline: boolean;
}

const KEY = "inboxpilot.settings";
let state: AppSettings = {
  theme: "light",
  useMock: (import.meta.env.VITE_USE_MOCK ?? "true") !== "false",
  useLlm: false,
  threshold: 0.5,
  referenceDate: REFERENCE_DATE,
  ollamaModel: MOCK_MODEL,
  backendOffline: false,
};
const listeners = new Set<() => void>();

export function getSettings() {
  return state;
}
export function setSettings(patch: Partial<AppSettings>) {
  state = { ...state, ...patch };
  if (typeof window !== "undefined") {
    const { backendOffline: _b, ...persist } = state;
    localStorage.setItem(KEY, JSON.stringify(persist));
  }
  listeners.forEach((l) => l());
}
/** Call from useEffect only. */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) setSettings(JSON.parse(raw));
  } catch {
    /* ignore */
  }
}
const serverSnap = state;
export function useSettings() {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => state,
    () => serverSnap,
  );
}
