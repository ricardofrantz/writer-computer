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
import { narrateActiveDocument } from "./play-actions";
import { ADAPTERS, PLANNED_ENGINES, type PlannedEngine } from "./engines";
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
      // Preserve any active editor selection — preventDefault on mousedown
      // stops the browser from shifting focus to the button, which would
      // otherwise collapse the user's selection before our onClick reads it.
      onMouseDown={(e) => e.preventDefault()}
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
  const activeEngineId = useNarratorStore((s) => s.activeEngineId);
  const setActiveEngine = useNarratorStore((s) => s.setActiveEngine);
  const settings = useAllSettings();
  const setSetting = useSetSetting();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [detectedEngines, setDetectedEngines] = useState<PlannedEngine[]>(PLANNED_ENGINES);

  useEffect(() => {
    setVoices(narratorEngine.getVoices());
    return narratorEngine.onVoicesChanged(() => {
      setVoices(narratorEngine.getVoices());
    });
  }, []);

  // Probe optional adapters (Kokoro, etc.) once on mount. Append any that
  // report available — they were absent from PLANNED_ENGINES so they only
  // show up here when the underlying CLI is on the user's PATH.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const extras: PlannedEngine[] = [];
      console.log(
        "[narrator] adapter probe starting; ADAPTERS:",
        ADAPTERS.map((a) => a.id),
        "PLANNED_ENGINES:",
        PLANNED_ENGINES.map((p) => p.id),
      );
      for (const adapter of ADAPTERS) {
        if (PLANNED_ENGINES.some((p) => p.id === adapter.id)) continue;
        const ok = await adapter.isAvailable();
        console.log(`[narrator] ${adapter.id}.isAvailable() →`, ok);
        if (ok) {
          extras.push({ id: adapter.id, displayName: adapter.displayName, status: "available" });
        }
      }
      console.log("[narrator] extras after probe:", extras);
      if (!cancelled && extras.length > 0) {
        setDetectedEngines([...PLANNED_ENGINES, ...extras]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isOpen) return null;

  function handlePlay() {
    // Transport ▶ always narrates the whole document. Selection-only
    // narration lives on dedicated entry points (floating ▶ on the
    // selection, right-click → Narrate selection) so the two modes don't
    // surprise each other.
    narrateActiveDocument();
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
        <select
          value={activeEngineId}
          onChange={(e) => setActiveEngine(e.target.value)}
          aria-label="Engine"
          className="max-w-[200px] rounded-md bg-[var(--surface-input)] px-1.5 text-[12px] text-[var(--text-primary)] outline-none h-[var(--chrome-control-height)]"
        >
          {detectedEngines.map((engine) => (
            <option
              key={engine.id}
              value={engine.id}
              disabled={engine.status === "coming-soon"}
              title={engine.note}
            >
              {engine.status === "coming-soon"
                ? `${engine.displayName} (coming soon)`
                : engine.displayName}
            </option>
          ))}
        </select>
        {activeEngineId === "apple" && voices.length > 0 && (
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
