import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon } from "@hugeicons/core-free-icons";
import { createSettingsTab, useEditorStore } from "@/stores/editor-store";

export function SettingsButton() {
  return (
    <button
      type="button"
      onClick={() => {
        useEditorStore
          .getState()
          .openOrFocus((tab) => tab.location.kind === "settings", createSettingsTab);
      }}
      aria-label="Open settings"
      title="Open settings (⌘,)"
      className="relative flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-icon-muted)] transition-[color,background-color,scale] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-secondary)] active:scale-[0.96] before:absolute before:-inset-1.5 before:content-['']"
    >
      <HugeiconsIcon icon={Settings01Icon} size={18} color="currentColor" strokeWidth={2} />
    </button>
  );
}
