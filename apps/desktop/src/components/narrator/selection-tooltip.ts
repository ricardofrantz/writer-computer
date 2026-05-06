import { showTooltip, type Tooltip, EditorView } from "@codemirror/view";
import { StateField } from "@codemirror/state";

function createTooltipDom(view: EditorView, from: number, to: number): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className =
    "flex items-center gap-1 rounded-md border border-[var(--line-subtler)] bg-[var(--surface-card)] px-1.5 py-1 backdrop-blur-md";

  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", "Narrate selection");
  button.title = "Narrate selection";
  button.className =
    "flex h-6 w-6 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]";
  button.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;

  button.addEventListener("mousedown", (e) => {
    e.preventDefault(); // keep selection alive
  });
  button.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Read the selection from live state — closure capture goes stale when
    // CodeMirror reuses the tooltip DOM across selection changes.
    const sel = view.state.selection.main;
    const sliceFrom = sel.from !== sel.to ? sel.from : from;
    const sliceTo = sel.from !== sel.to ? sel.to : to;
    const text = view.state.sliceDoc(sliceFrom, sliceTo);
    if (!text.trim()) return;
    const { useNarratorStore } = await import("./narrator-store");
    const { narratorEngine } = await import("./narrator-engine");
    const { segmentBlocks } = await import("./segment-blocks");
    const { useSettingsStore } = await import("@/stores/settings-store");

    const settings = useSettingsStore.getState().settings;
    const skipCodeBlocks = (settings["narrator.skip-code-blocks"] as boolean) ?? true;
    const skipFrontmatter = (settings["narrator.skip-frontmatter"] as boolean) ?? true;
    const voiceName = (settings["narrator.voice"] as string) ?? "";
    const rate = (settings["narrator.rate"] as number) ?? 1;
    const pitch = (settings["narrator.pitch"] as number) ?? 1;
    const voice = voiceName
      ? narratorEngine.getVoices().find((v) => v.name === voiceName)
      : undefined;
    const blocks = segmentBlocks(text, { skipCodeBlocks, skipFrontmatter });
    if (blocks.length === 0) return;
    useNarratorStore.getState().open();
    narratorEngine.play(blocks, { voice, rate, pitch });
  });

  wrapper.appendChild(button);
  return wrapper;
}

function getTooltips(state: import("@codemirror/state").EditorState): readonly Tooltip[] {
  const sel = state.selection.main;
  if (sel.from === sel.to) return [];
  return [
    {
      pos: sel.from,
      above: true,
      strictSide: true,
      arrow: false,
      create: (view) => {
        const dom = createTooltipDom(view, sel.from, sel.to);
        return { dom };
      },
    },
  ];
}

export function narratorSelectionTooltip() {
  return StateField.define<readonly Tooltip[]>({
    create: getTooltips,
    update: (_value, tr) => getTooltips(tr.state),
    provide: (f) => showTooltip.computeN([f], (state) => state.field(f)),
  });
}
