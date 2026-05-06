import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  PauseIcon,
  PlayIcon,
  StopIcon,
} from "@hugeicons/core-free-icons";
import { useNarratorStore } from "./narrator-store";
import { narratorEngine } from "./narrator-engine";
import { segmentBlocks } from "./segment-blocks";
import { useEditorStore } from "@/stores/editor-store";
import * as editorApi from "@/hooks/editor-api";
import { useAllSettings, useSetSetting } from "@/hooks/use-settings";

interface IconButtonProps {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}

function IconButton({ label, onClick, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-secondary)] h-[var(--chrome-control-height)] w-[var(--chrome-control-height)]"
    >
      {children}
    </button>
  );
}

export function NarratorTransportBar() {
  const isOpen = useNarratorStore((s) => s.isOpen);
  const playState = useNarratorStore((s) => s.playState);
  const currentBlockIndex = useNarratorStore((s) => s.currentBlockIndex);
  const totalBlocks = useNarratorStore((s) => s.totalBlocks);
  // Subscribe reactively so the component re-renders when the active file changes.
  // We don't use this value directly — editorApi.getActiveFilePath() is called at
  // play time to ensure we read the latest value.
  useEditorStore((s) => s.activeFilePath);
  const settings = useAllSettings();
  const setSetting = useSetSetting();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    setVoices(narratorEngine.getVoices());
    return narratorEngine.onVoicesChanged(() => {
      setVoices(narratorEngine.getVoices());
    });
  }, []);

  if (!isOpen) return null;

  function handlePlay() {
    const path = editorApi.getActiveFilePath();
    const file = path ? editorApi.getOpenFile(path) : null;
    const text = file?.content ?? "";
    const skipCodeBlocks = (settings["narrator.skip-code-blocks"] as boolean) ?? true;
    const skipFrontmatter = (settings["narrator.skip-frontmatter"] as boolean) ?? true;
    const segments = segmentBlocks(text, { skipCodeBlocks, skipFrontmatter });
    const voiceName = (settings["narrator.voice"] as string) ?? "";
    const voice = voiceName
      ? narratorEngine.getVoices().find((v) => v.name === voiceName)
      : undefined;
    const rate = (settings["narrator.rate"] as number) ?? 1;
    const pitch = (settings["narrator.pitch"] as number) ?? 1;
    narratorEngine.play(segments, { voice, rate, pitch });
  }

  function handleClose() {
    narratorEngine.stop();
    useNarratorStore.getState().close();
  }

  const playPauseLabel = playState === "playing" ? "Pause" : "Play";
  const playPauseIcon = playState === "playing" ? PauseIcon : PlayIcon;
  function handlePlayPause() {
    if (playState === "playing") {
      narratorEngine.pause();
    } else if (playState === "paused") {
      narratorEngine.resume();
    } else {
      handlePlay();
    }
  }

  const rate = (settings["narrator.rate"] as number) ?? 1;
  const pitch = (settings["narrator.pitch"] as number) ?? 1;
  const voiceName = (settings["narrator.voice"] as string) ?? "";

  return (
    <div
      role="dialog"
      aria-label="Narrator controls"
      className="pointer-events-auto absolute bottom-2 left-3 z-40 overflow-hidden rounded-2xl border border-[var(--line-subtler)] bg-[var(--surface-card)] p-2 backdrop-blur-md"
    >
      <div className="flex items-center gap-1.5">
        <IconButton label={playPauseLabel} onClick={handlePlayPause}>
          <HugeiconsIcon icon={playPauseIcon} size={14} color="currentColor" strokeWidth={2} />
        </IconButton>
        <IconButton label="Stop" onClick={() => narratorEngine.stop()}>
          <HugeiconsIcon icon={StopIcon} size={14} color="currentColor" strokeWidth={2} />
        </IconButton>
        <IconButton label="Previous block" onClick={() => narratorEngine.skipPrevious()}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} color="currentColor" strokeWidth={2} />
        </IconButton>
        <IconButton label="Next block" onClick={() => narratorEngine.skipNext()}>
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} color="currentColor" strokeWidth={2} />
        </IconButton>
        {totalBlocks > 0 && (
          <span className="px-1 text-[12px] tabular-nums text-[var(--text-muted)]">
            {currentBlockIndex + 1}/{totalBlocks}
          </span>
        )}
        {voices.length > 0 && (
          <select
            value={voiceName}
            onChange={(e) => void setSetting("narrator.voice", e.target.value)}
            aria-label="Voice"
            className="max-w-[120px] rounded-md bg-[var(--surface-input)] px-1.5 text-[12px] text-[var(--text-primary)] outline-none h-[var(--chrome-control-height)]"
          >
            <option value="">Default</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-1 text-[12px] text-[var(--text-muted)]">
          <span>Rate</span>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={rate}
            onChange={(e) => void setSetting("narrator.rate", parseFloat(e.target.value))}
            className="w-16"
            aria-label="Speech rate"
          />
          <span className="w-6 tabular-nums">{rate.toFixed(1)}</span>
        </label>
        <label className="flex items-center gap-1 text-[12px] text-[var(--text-muted)]">
          <span>Pitch</span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={pitch}
            onChange={(e) => void setSetting("narrator.pitch", parseFloat(e.target.value))}
            className="w-16"
            aria-label="Voice pitch"
          />
          <span className="w-6 tabular-nums">{pitch.toFixed(1)}</span>
        </label>
        <IconButton label="Close narrator" onClick={handleClose}>
          <HugeiconsIcon icon={Cancel01Icon} size={14} color="currentColor" strokeWidth={2} />
        </IconButton>
      </div>
    </div>
  );
}
