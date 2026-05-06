// Adapter registry. Today only the Apple system-TTS adapter ships — Writer
// is an ultralight markdown editor and bundling/installing third-party TTS
// engines (Kokoro, Qwen3, Chatterbox, Fish-Speech) is explicitly out of
// scope. The TtsAdapter interface stays so we can swap implementations
// without rewriting call sites if that ever changes.

import type { TtsAdapter } from "./adapter";
import { appleAdapter } from "./apple";

export const ADAPTERS: TtsAdapter[] = [appleAdapter];

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
