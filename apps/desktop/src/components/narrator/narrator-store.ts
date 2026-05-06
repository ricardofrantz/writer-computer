import { create } from "zustand";

type PlayState = "idle" | "playing" | "paused";

interface NarratorState {
  isOpen: boolean;
  playState: PlayState;
  currentBlockIndex: number;
  totalBlocks: number;
  voiceName: string | null;
  open: () => void;
  close: () => void;
  setPlayState: (s: PlayState) => void;
  setProgress: (currentBlockIndex: number, totalBlocks: number) => void;
  setVoice: (name: string | null) => void;
}

export const useNarratorStore = create<NarratorState>((set) => ({
  isOpen: false,
  playState: "idle",
  currentBlockIndex: 0,
  totalBlocks: 0,
  voiceName: null,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setPlayState: (s) => set({ playState: s }),
  setProgress: (currentBlockIndex, totalBlocks) => set({ currentBlockIndex, totalBlocks }),
  setVoice: (name) => set({ voiceName: name }),
}));
