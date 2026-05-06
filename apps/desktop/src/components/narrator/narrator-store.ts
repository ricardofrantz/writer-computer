import { create } from "zustand";
import { useSettingsStore } from "@/stores/settings-store";

type PlayState = "idle" | "playing" | "paused";

interface NarratorState {
  isOpen: boolean;
  playState: PlayState;
  currentBlockIndex: number;
  totalBlocks: number;
  voiceName: string | null;
  /** Active TTS engine. Mirrors `narrator.engine` setting. Defaults to "apple"
   *  until settings hydrate. */
  activeEngineId: string;
  open: () => void;
  close: () => void;
  setPlayState: (s: PlayState) => void;
  setProgress: (currentBlockIndex: number, totalBlocks: number) => void;
  setVoice: (name: string | null) => void;
  /** Switch engines. Cancels any in-flight playback and persists to settings. */
  setActiveEngine: (id: string) => void;
}

function initialEngineId(): string {
  try {
    const settingsValue = useSettingsStore.getState().settings["narrator.engine"];
    if (typeof settingsValue === "string" && settingsValue.length > 0) {
      return settingsValue;
    }
  } catch {
    // Settings store may not be hydrated yet at module-load — fall through.
  }
  return "apple";
}

export const useNarratorStore = create<NarratorState>((set) => ({
  isOpen: false,
  playState: "idle",
  currentBlockIndex: 0,
  totalBlocks: 0,
  voiceName: null,
  activeEngineId: initialEngineId(),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setPlayState: (s) => set({ playState: s }),
  setProgress: (currentBlockIndex, totalBlocks) => set({ currentBlockIndex, totalBlocks }),
  setVoice: (name) => set({ voiceName: name }),
  setActiveEngine: (id) => {
    // Lazy import to avoid circular dependency: narrator-engine imports the
    // store, the store imports stop() back. Resolve at call time.
    void import("./narrator-engine").then((m) => m.narratorEngine.stop());
    set({ activeEngineId: id });
    void useSettingsStore.getState().setSetting("narrator.engine", id);
  },
}));
