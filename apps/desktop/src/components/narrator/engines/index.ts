// Two registries:
//   ADAPTERS         — engines that actually run today.
//   PLANNED_ENGINES  — UI roadmap surfaced in the engine picker. Includes
//                      "coming soon" entries so users see what's in flight.
// They overlap on `apple` only for now; new entries cross over from PLANNED to
// ADAPTERS as each phase ships.

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
  {
    id: "kokoro",
    displayName: "Kokoro-82M",
    status: "coming-soon",
    note: "Local neural TTS, ~350 MB. Apache 2.0.",
  },
  {
    id: "qwen3",
    displayName: "Qwen3-TTS",
    status: "coming-soon",
    note: "Voice cloning, multilingual. Apache 2.0.",
  },
  {
    id: "chatterbox",
    displayName: "Chatterbox",
    status: "coming-soon",
    note: "Voice cloning, watermarked output. MIT.",
  },
  {
    id: "fish-speech",
    displayName: "Fish-Speech",
    status: "coming-soon",
    note: "Highest quality, non-commercial license.",
  },
];

export type {
  TtsAdapter,
  AdapterVoice,
  BoundaryEvent,
  BoundaryLevel,
  PlayCallbacks,
  SpeakOpts,
} from "./adapter";
