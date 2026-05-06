import { HugeiconsIcon } from "@hugeicons/react";
import { VolumeUpIcon } from "@hugeicons/core-free-icons";
import { useNarratorStore } from "@/components/narrator/narrator-store";
import { narratorEngine } from "@/components/narrator/narrator-engine";
import { narrateActiveDocument } from "@/components/narrator/play-actions";

// "Narrate whole document" entry point. Selection paths (floating ▶,
// right-click → Narrate selection) handle the per-selection case
// independently — this button always means "play the whole file".
export function NarratorButton() {
  return (
    <button
      type="button"
      // Preserve any active editor selection across the click. The
      // selection paths use it; this button doesn't, but `mousedown
      // preventDefault` is harmless and keeps the UI predictable.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        const state = useNarratorStore.getState();
        if (state.playState === "playing" || state.playState === "paused") {
          // Mid-narration — clicking the button again stops and closes,
          // matching the toggle semantics users expect from a single icon.
          narratorEngine.stop();
          state.close();
          return;
        }
        narrateActiveDocument();
      }}
      aria-label="Narrate document"
      title="Narrate document (⌘⇧L)"
      className="relative flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-icon-muted)] transition-[color,background-color,scale] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-secondary)] active:scale-[0.96] before:absolute before:-inset-1.5 before:content-['']"
    >
      <HugeiconsIcon icon={VolumeUpIcon} size={18} color="currentColor" strokeWidth={2} />
    </button>
  );
}
