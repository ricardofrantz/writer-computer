// Adapter registry. Apple system TTS is always available. Optional
// adapters (Kokoro) only show up in the engine picker when the user has
// installed the underlying CLI on their PATH — Writer never bundles or
// installs third-party TTS engines.

import type { TtsAdapter } from "./adapter";
import { appleAdapter } from "./apple";
import { kokoroAdapter } from "./kokoro";

// All registered adapters. Whether each one is *usable* in the current
// runtime is decided by isAvailable(), which the picker queries.
export const ADAPTERS: TtsAdapter[] = [appleAdapter, kokoroAdapter];

export function getAdapterById(id: string): TtsAdapter {
  return ADAPTERS.find((a) => a.id === id) ?? appleAdapter;
}

export async function listAvailableAdapters(): Promise<TtsAdapter[]> {
  const rows = await Promise.all(
    ADAPTERS.map(async (a) => ({ adapter: a, ok: await a.isAvailable() })),
  );
  return rows.filter((r) => r.ok).map((r) => r.adapter);
}

export interface PlannedEngine {
  id: string;
  displayName: string;
  status: "available" | "coming-soon";
  /** One-line description shown as the option's `title` attribute. */
  note?: string;
}

// Roadmap-style picker entries. Apple always shows; Kokoro only shows
// after a successful runtime probe (see useDetectedEngines in transport-bar).
export const PLANNED_ENGINES: PlannedEngine[] = [
  { id: "apple", displayName: "Apple (system voices)", status: "available" },
];

export type {
  TtsAdapter,
  AdapterVoice,
  BoundaryEvent,
  BoundaryLevel,
  PlayCallbacks,
  SpeakOpts,
} from "./adapter";
