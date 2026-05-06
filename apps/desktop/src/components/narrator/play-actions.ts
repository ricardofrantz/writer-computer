// Shared action helpers for the narrator. The selection paths
// (floating ▶ on text selection, right-click "Narrate selection") have
// their own inline implementations because they need access to the
// CodeMirror EditorView's selection range. This file owns the
// "narrate the whole document" path used by the sidebar 🔊 button and
// the transport bar's ▶ — both paths must behave identically.

import { useNarratorStore } from "./narrator-store";
import { narratorEngine } from "./narrator-engine";
import { segmentBlocks } from "./segment-blocks";
import * as editorApi from "@/hooks/editor-api";
import { useSettingsStore } from "@/stores/settings-store";

/** Open the transport (if not already open) and start narrating the
 *  active document from the top. Selection is intentionally ignored —
 *  for selection-only narration, use the floating ▶ on the selection
 *  or the right-click → Narrate selection menu item. */
export function narrateActiveDocument(): void {
  const path = editorApi.getActiveFilePath();
  const file = path ? editorApi.getOpenFile(path) : null;
  const text = file?.content ?? "";
  if (!text.trim()) return;

  const settings = useSettingsStore.getState().settings;
  const skipCodeBlocks = (settings["narrator.skip-code-blocks"] as boolean) ?? true;
  const skipFrontmatter = (settings["narrator.skip-frontmatter"] as boolean) ?? true;
  const segments = segmentBlocks(text, { skipCodeBlocks, skipFrontmatter });
  if (segments.length === 0) return;

  const voiceName = (settings["narrator.voice"] as string) ?? "";
  const voice = voiceName
    ? narratorEngine.getVoices().find((v) => v.name === voiceName)
    : undefined;
  const rate = (settings["narrator.rate"] as number) ?? 1;
  const pitch = (settings["narrator.pitch"] as number) ?? 1;

  useNarratorStore.getState().open();
  narratorEngine.play(segments, { voice, rate, pitch });
}
