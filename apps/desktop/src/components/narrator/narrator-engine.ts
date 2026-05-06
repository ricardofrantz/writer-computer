import { useNarratorStore } from "./narrator-store";

let blocks: string[] = [];
let currentIndex = 0;
let currentOpts: { voice?: SpeechSynthesisVoice; rate: number; pitch: number } = {
  rate: 1,
  pitch: 1,
};
const voicesChangedCallbacks = new Set<() => void>();

if (typeof window !== "undefined") {
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    voicesChangedCallbacks.forEach((cb) => cb());
  });
}

function speakCurrent(): void {
  const { setPlayState, setProgress } = useNarratorStore.getState();
  if (currentIndex >= blocks.length) {
    setPlayState("idle");
    return;
  }
  const utt = new SpeechSynthesisUtterance(blocks[currentIndex]);
  utt.rate = currentOpts.rate;
  utt.pitch = currentOpts.pitch;
  if (currentOpts.voice) {
    utt.voice = currentOpts.voice;
  }
  utt.onend = () => {
    currentIndex++;
    useNarratorStore.getState().setProgress(currentIndex, blocks.length);
    speakCurrent();
  };
  utt.onerror = () => {
    useNarratorStore.getState().setPlayState("idle");
  };
  window.speechSynthesis.speak(utt);
  setPlayState("playing");
  setProgress(currentIndex, blocks.length);
}

export const narratorEngine = {
  play(
    newBlocks: string[],
    opts: {
      voice?: SpeechSynthesisVoice;
      rate: number;
      pitch: number;
      startIndex?: number;
    },
  ): void {
    blocks = newBlocks;
    currentIndex = opts.startIndex ?? 0;
    currentOpts = { voice: opts.voice, rate: opts.rate, pitch: opts.pitch };
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    speakCurrent();
  },

  pause(): void {
    if (typeof window === "undefined") return;
    window.speechSynthesis.pause();
    useNarratorStore.getState().setPlayState("paused");
  },

  resume(): void {
    if (typeof window === "undefined") return;
    window.speechSynthesis.resume();
    useNarratorStore.getState().setPlayState("playing");
  },

  stop(): void {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    blocks = [];
    currentIndex = 0;
    useNarratorStore.getState().setPlayState("idle");
    useNarratorStore.getState().setProgress(0, 0);
  },

  skipNext(): void {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    currentIndex++;
    if (currentIndex >= blocks.length) {
      useNarratorStore.getState().setPlayState("idle");
      return;
    }
    speakCurrent();
  },

  skipPrevious(): void {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    currentIndex = Math.max(0, currentIndex - 1);
    speakCurrent();
  },

  getVoices(): SpeechSynthesisVoice[] {
    if (typeof window === "undefined") return [];
    return window.speechSynthesis.getVoices();
  },

  onVoicesChanged(cb: () => void): () => void {
    voicesChangedCallbacks.add(cb);
    return () => {
      voicesChangedCallbacks.delete(cb);
    };
  },
};
