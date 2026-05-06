import { HugeiconsIcon } from "@hugeicons/react";
import { VolumeUpIcon } from "@hugeicons/core-free-icons";
import { useNarratorStore } from "@/components/narrator/narrator-store";
import { narratorEngine } from "@/components/narrator/narrator-engine";

export function NarratorButton() {
  return (
    <button
      type="button"
      onClick={() => {
        const state = useNarratorStore.getState();
        if (state.isOpen) {
          narratorEngine.stop();
          state.close();
        } else {
          state.open();
        }
      }}
      aria-label="Open narrator"
      title="Open narrator (⌘⇧L)"
      className="relative flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-icon-muted)] transition-[color,background-color,scale] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-secondary)] active:scale-[0.96] before:absolute before:-inset-1.5 before:content-['']"
    >
      <HugeiconsIcon icon={VolumeUpIcon} size={18} color="currentColor" strokeWidth={2} />
    </button>
  );
}
