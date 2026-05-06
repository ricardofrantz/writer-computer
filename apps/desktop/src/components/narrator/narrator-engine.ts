// Thin dispatcher that delegates to the active TTS adapter. The public API
// stays byte-identical to the pre-Phase-0 shape so existing call sites
// (transport-bar, selection-tooltip, use-prosemark-editor, sidebar narrator
// button, keyboard shortcut handler) keep working without changes.

import { getAdapterById } from "./engines";
import {
  appleAdapter,
  appleSkipNext,
  appleSkipPrevious,
  getAppleNativeVoices,
} from "./engines/apple";
import { useNarratorStore } from "./narrator-store";

function adapter() {
  return getAdapterById(useNarratorStore.getState().activeEngineId);
}

let lastCallbacks: import("./engines").PlayCallbacks | null = null;

export const narratorEngine = {
  play(
    blocks: string[],
    opts: {
      voice?: SpeechSynthesisVoice;
      rate: number;
      pitch: number;
      startIndex?: number;
    },
  ): void {
    const a = adapter();
    const voiceId = opts.voice?.name ?? null;
    const callbacks = {
      onBoundary: () => {
        // Karaoke wiring lands in Phase 2 of #19. Boundary events are
        // accepted now so the adapter contract is stable; nothing consumes
        // them yet.
      },
      onProgress: (currentIndex: number, total: number) =>
        useNarratorStore.getState().setProgress(currentIndex, total),
      onEnd: () => useNarratorStore.getState().setPlayState("idle"),
    };
    lastCallbacks = callbacks;
    a.play(
      blocks,
      {
        voiceId,
        rate: opts.rate,
        pitch: opts.pitch,
        startIndex: opts.startIndex ?? 0,
      },
      callbacks,
    );
    useNarratorStore.getState().setPlayState("playing");
  },

  pause(): void {
    adapter().pause();
    useNarratorStore.getState().setPlayState("paused");
  },

  resume(): void {
    adapter().resume();
    useNarratorStore.getState().setPlayState("playing");
  },

  stop(): void {
    adapter().cancel();
    lastCallbacks = null;
    useNarratorStore.getState().setPlayState("idle");
    useNarratorStore.getState().setProgress(0, 0);
  },

  skipNext(): void {
    // Apple-specific advance helper — keeps mid-queue navigation working.
    // Other adapters will register their own skip helpers as they ship.
    if (adapter().id === "apple") {
      appleSkipNext(lastCallbacks);
    }
  },

  skipPrevious(): void {
    if (adapter().id === "apple") {
      appleSkipPrevious();
    }
  },

  getVoices(): SpeechSynthesisVoice[] {
    // Back-compat: callers (selection-tooltip, transport-bar's voice picker,
    // right-click handler) destructure SpeechSynthesisVoice fields. Returning
    // the native list when the active engine is Apple keeps them working
    // unchanged. Non-Apple engines return [] — the transport's voice picker
    // already gates rendering on this.
    if (adapter().id === "apple") return getAppleNativeVoices();
    return [];
  },

  onVoicesChanged(cb: () => void): () => void {
    // Apple's voiceschanged event fires once at startup on most systems.
    // Forward it through the adapter so consumers refresh their picker.
    return appleAdapter.onVoicesChanged(cb);
  },
};
