// Optional Kokoro adapter — only present in the picker when the user has
// installed the `kokoro` Python CLI on their PATH. Writer never bundles or
// installs it. Detection is a Tauri command that runs `which kokoro`.
//
// Per-block synthesis: invoke Rust → spawn `kokoro` → temp WAV → bytes →
// AudioContext.decodeAudioData → AudioBufferSourceNode. No long-running
// daemon, no port management, no model download (the Python kokoro
// package handles its own model on first use).

import type { AdapterVoice, BoundaryLevel, PlayCallbacks, SpeakOpts, TtsAdapter } from "./adapter";
import { invoke } from "@tauri-apps/api/core";

// The Kokoro-82M ONNX model exposes 24 baked-in voices. Curated subset of
// the most useful English voices; the underlying CLI accepts any of the
// model's voice IDs so users can override via narrator.voice.kokoro.
const KOKORO_VOICES: AdapterVoice[] = [
  { id: "af_bella", label: "Bella (US Female)", lang: "en-US" },
  { id: "af_heart", label: "Heart (US Female)", lang: "en-US" },
  { id: "af_nicole", label: "Nicole (US Female)", lang: "en-US" },
  { id: "af_sarah", label: "Sarah (US Female)", lang: "en-US" },
  { id: "af_sky", label: "Sky (US Female)", lang: "en-US" },
  { id: "am_adam", label: "Adam (US Male)", lang: "en-US" },
  { id: "am_michael", label: "Michael (US Male)", lang: "en-US" },
  { id: "bf_emma", label: "Emma (UK Female)", lang: "en-GB" },
  { id: "bf_isabella", label: "Isabella (UK Female)", lang: "en-GB" },
  { id: "bm_daniel", label: "Daniel (UK Male)", lang: "en-GB" },
  { id: "bm_george", label: "George (UK Male)", lang: "en-GB" },
];

let probedPath: string | null | undefined; // undefined = not probed yet
let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let cancelled = false;

function getAudioContext(): AudioContext {
  if (!audioContext) audioContext = new AudioContext();
  return audioContext;
}

function playBuffer(
  buf: AudioBuffer,
  ctx: AudioContext,
  registerSource: (s: AudioBufferSourceNode) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.connect(ctx.destination);
    source.onended = () => resolve();
    registerSource(source);
    source.start();
  });
}

export const kokoroAdapter: TtsAdapter = {
  id: "kokoro",
  displayName: "Kokoro (local, if installed)",

  async isAvailable(): Promise<boolean> {
    if (probedPath !== undefined) return probedPath !== null;
    try {
      const path = await invoke<string | null>("kokoro_probe");
      probedPath = path && path.length > 0 ? path : null;
      return probedPath !== null;
    } catch {
      probedPath = null;
      return false;
    }
  },

  async listVoices(): Promise<AdapterVoice[]> {
    return KOKORO_VOICES;
  },

  boundaryLevel(): BoundaryLevel {
    // The Python kokoro CLI doesn't emit per-word timestamps in its current
    // shape. Karaoke falls back to per-block highlight when this engine is
    // active. Apple stays "word" for users who care about per-word sync.
    return "block";
  },

  play(blocks: string[], opts: SpeakOpts, cb: PlayCallbacks): void {
    cancelled = false;
    void (async () => {
      try {
        // Resolve the binary path once per play() — probe is cached, so this
        // is free after the first call. We pass it to every synth so Rust
        // doesn't re-do the lookup (and so we don't depend on PATH at all).
        if (probedPath === undefined) {
          await this.isAvailable();
        }
        if (!probedPath) {
          console.error("[kokoro] not installed; engine should not have been selectable");
          cb.onEnd();
          return;
        }
        const binaryPath = probedPath;
        const ctx = getAudioContext();
        for (let i = opts.startIndex; i < blocks.length; i++) {
          if (cancelled) return;
          cb.onProgress(i, blocks.length);
          const text = blocks[i].trim();
          if (!text) continue;
          const bytes = await invoke<number[]>("kokoro_synth", {
            binaryPath,
            text,
            voice: opts.voiceId ?? "af_bella",
            speed: opts.rate,
          });
          if (cancelled) return;
          const arrayBuf = new Uint8Array(bytes).buffer;
          const audioBuf = await ctx.decodeAudioData(arrayBuf);
          await playBuffer(audioBuf, ctx, (src) => {
            currentSource = src;
          });
          if (cancelled) return;
        }
        cb.onEnd();
      } catch (err) {
        console.error("[kokoro]", err);
        cb.onEnd();
      }
    })();
  },

  pause(): void {
    if (audioContext && audioContext.state === "running") void audioContext.suspend();
  },

  resume(): void {
    if (audioContext && audioContext.state === "suspended") void audioContext.resume();
  },

  cancel(): void {
    cancelled = true;
    if (currentSource) {
      try {
        currentSource.stop();
      } catch {
        // already stopped
      }
      currentSource = null;
    }
  },

  onVoicesChanged(_cb: () => void): () => void {
    return () => {};
  },
};
