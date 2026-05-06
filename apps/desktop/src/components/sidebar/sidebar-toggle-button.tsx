import { HugeiconsIcon } from "@hugeicons/react";
import { SidebarLeftIcon } from "@hugeicons/core-free-icons";
import { useSidebar } from "@/hooks/use-sidebar";

export function SidebarToggleButton() {
  const { isSidebarVisible, toggleSidebar } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={isSidebarVisible ? "Hide sidebar" : "Show sidebar"}
      title={isSidebarVisible ? "Hide sidebar" : "Show sidebar"}
      className="relative flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-icon-muted)] transition-[color,background-color,scale] before:absolute before:-inset-1.5 before:content-[''] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-secondary)] active:scale-[0.96]"
    >
      <HugeiconsIcon icon={SidebarLeftIcon} size={18} color="currentColor" strokeWidth={2} />
    </button>
  );
}
