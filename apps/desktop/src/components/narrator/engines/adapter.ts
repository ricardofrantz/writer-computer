// Common shape every TTS engine implements. The narrator-engine dispatcher
// delegates `play / pause / resume / cancel` to whichever adapter is active.

export type BoundaryLevel = "word" | "sentence" | "block";

export interface AdapterVoice {
  /** Stable identifier — what gets persisted in `narrator.voice`. */
  id: string;
  /** Human-readable label for the picker. */
  label: string;
  /** Optional language hint (e.g. `"en-US"`). */
  lang?: string;
}

export interface BoundaryEvent {
  blockIndex: number;
  charIndex: number;
  charLength: number;
}

export interface SpeakOpts {
  voiceId: string | null;
  rate: number;
  pitch: number;
  startIndex: number;
}

export interface PlayCallbacks {
  onBoundary: (event: BoundaryEvent) => void;
  onProgress: (currentIndex: number, total: number) => void;
  onEnd: () => void;
}

export interface TtsAdapter {
  readonly id: string;
  readonly displayName: string;
  /** Probe — false if the engine isn't usable in this build. Result is cached
   *  by the registry on first call. */
  isAvailable(): Promise<boolean>;
  listVoices(): Promise<AdapterVoice[]>;
  /** Best-effort granularity. May change after the first speak() if the adapter
   *  probes lazily (e.g. Apple voice probing). */
  boundaryLevel(): BoundaryLevel;
  play(blocks: string[], opts: SpeakOpts, callbacks: PlayCallbacks): void;
  pause(): void;
  resume(): void;
  cancel(): void;
  /** Subscribe to voice-list changes (e.g. Apple's `voiceschanged` event). */
  onVoicesChanged(cb: () => void): () => void;
}
