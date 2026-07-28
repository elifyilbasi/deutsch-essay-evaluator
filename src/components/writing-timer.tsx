"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { formatDuration } from "@/lib/formatDuration";

export type TimerDisplay = {
  text: string;
  isOvertime: boolean;
  isRunningLow: boolean;
  tone: "normal" | "warning" | "overtime";
};

/** Pure display state, split out from the JSX so the thresholds are testable. */
export function timerDisplay(elapsedSeconds: number, limitMinutes: number): TimerDisplay {
  const remaining = limitMinutes * 60 - elapsedSeconds;
  const isOvertime = remaining < 0;
  // The last five minutes get a gentle warning colour, not an alarm.
  const isRunningLow = !isOvertime && remaining <= 5 * 60;

  return {
    text: isOvertime ? `+${formatDuration(-remaining)}` : formatDuration(remaining),
    isOvertime,
    isRunningLow,
    tone: isOvertime ? "overtime" : isRunningLow ? "warning" : "normal",
  };
}

/**
 * Counts the writing time against the exam limit. It keeps running past zero
 * rather than blocking: overtime is worth knowing about, but losing someone's
 * unsaved work to a hard cut-off is not a trade we want to make.
 */
export function WritingTimer({
  elapsedSeconds,
  limitMinutes,
  isRunning,
}: {
  elapsedSeconds: number;
  limitMinutes: number;
  isRunning: boolean;
}) {
  const [hidden, setHidden] = useState(false);

  const { text, isOvertime, isRunningLow } = timerDisplay(elapsedSeconds, limitMinutes);

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        className="text-xs text-muted-foreground underline underline-offset-2"
      >
        Show timer
      </button>
    );
  }

  const tone = isOvertime
    ? "text-destructive"
    : isRunningLow
      ? "text-warning"
      : "text-muted-foreground";

  return (
    <div className="flex items-center gap-2">
      <Timer className={`size-3.5 ${tone}`} />
      <span className={`font-mono text-sm tabular-nums ${tone}`}>{text}</span>
      <span className="text-xs text-muted-foreground">
        {isOvertime
          ? `over ${limitMinutes} min`
          : isRunning
            ? `of ${limitMinutes} min`
            : `${limitMinutes} min — starts when you type`}
      </span>
      <button
        type="button"
        onClick={() => setHidden(true)}
        className="text-xs text-muted-foreground underline underline-offset-2"
      >
        Hide
      </button>
    </div>
  );
}

/** Ticks once a second while running. Returns elapsed seconds and a starter. */
export function useWritingTimer() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  return {
    elapsedSeconds,
    isRunning,
    start: () => setIsRunning(true),
    stop: () => setIsRunning(false),
  };
}
