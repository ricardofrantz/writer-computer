// Apple system voices via the Web Speech API. macOS WKWebView delegates to
// AVSpeechSynthesizer, which is the same engine VoiceOver uses. No model
// download, no network, no API key — voices come from System Settings →
// Accessibility → Spoken Content.

import type { AdapterVoice, BoundaryLevel, PlayCallbacks, SpeakOpts, TtsAdapter } from "./adapter";

const voicesChangedCallbacks = new Set<() => void>();

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    voicesChangedCallbacks.forEach((cb) => cb());
  });
}

let blocks: string[] = [];
let currentIndex = 0;
let currentOpts: SpeakOpts = { voiceId: null, rate: 1, pitch: 1, startIndex: 0 };
let currentCallbacks: PlayCallbacks | null = null;

function speakCurrent(): void {
  if (currentIndex >= blocks.length) {
    currentCallbacks?.onEnd();
    return;
  }
  const utt = new SpeechSynthesisUtterance(blocks[currentIndex]);
  utt.rate = currentOpts.rate;
  utt.pitch = currentOpts.pitch;
  if (currentOpts.voiceId) {
    const voice = window.speechSynthesis.getVoices().find((v) => v.name === currentOpts.voiceId);
    if (voice) utt.voice = voice;
  }
  utt.onboundary = (e) => {
    currentCallbacks?.onBoundary({
      blockIndex: currentIndex,
      charIndex: e.charIndex,
      charLength: e.charLength ?? 0,
    });
  };
  utt.onend = () => {
    currentIndex++;
    currentCallbacks?.onProgress(currentIndex, blocks.length);
    speakCurrent();
  };
  utt.onerror = () => {
    currentCallbacks?.onEnd();
  };
  window.speechSynthesis.speak(utt);
  currentCallbacks?.onProgress(currentIndex, blocks.length);
}

export const appleAdapter: TtsAdapter = {
  id: "apple",
  displayName: "Apple (system voices)",

  async isAvailable() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  },

  async listVoices(): Promise<AdapterVoice[]> {
    if (typeof window === "undefined") return [];
    return window.speechSynthesis.getVoices().map((v) => ({
      id: v.name,
      label: v.name,
      lang: v.lang,
    }));
  },

  boundaryLevel(): BoundaryLevel {
    // Word-level on macOS Apple voices (Samantha, Daniel, Karen, etc.).
    // Some third-party voices report only sentence-level — Phase 2 karaoke
    // will probe at runtime and degrade if needed.
    return "word";
  },

  play(newBlocks, opts, callbacks) {
    blocks = newBlocks;
    currentIndex = opts.startIndex;
    currentOpts = opts;
    currentCallbacks = callbacks;
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    speakCurrent();
  },

  pause() {
    if (typeof window === "undefined") return;
    window.speechSynthesis.pause();
  },

  resume() {
    if (typeof window === "undefined") return;
    window.speechSynthesis.resume();
  },

  cancel() {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    blocks = [];
    currentIndex = 0;
    currentCallbacks = null;
  },

  onVoicesChanged(cb) {
    voicesChangedCallbacks.add(cb);
    return () => {
      voicesChangedCallbacks.delete(cb);
    };
  },
};

// Internal helpers used by the dispatcher's back-compat shim. Not part of the
// public TtsAdapter interface — the shim returns `SpeechSynthesisVoice[]` so
// existing call sites that destructure `.name` keep working until the wider
// AdapterVoice migration lands.
export function getAppleNativeVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined") return [];
  return window.speechSynthesis.getVoices();
}

export function getAppleCurrentIndex(): number {
  return currentIndex;
}

export function appleSkipNext(callbacks: PlayCallbacks | null): void {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  currentIndex++;
  if (currentIndex >= blocks.length) {
    callbacks?.onEnd();
    return;
  }
  speakCurrent();
}

export function appleSkipPrevious(): void {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  currentIndex = Math.max(0, currentIndex - 1);
  speakCurrent();
}
