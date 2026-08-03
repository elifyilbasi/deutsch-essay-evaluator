"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  clearDraft,
  pruneDrafts,
  readDraft,
  writeDraft,
  type Draft,
  type StorageLike,
} from "@/lib/drafts";

/** How long typing pauses before a draft is written. */
const DEBOUNCE_MS = 1000;

/**
 * localStorage, or null where the browser refuses it. Safari in private mode has
 * historically thrown on access rather than on write, so even reaching for it is
 * wrapped.
 */
function safeStorage(): StorageLike | null {
  try {
    const s = window.localStorage;
    // Touching a property is the cheapest way to trigger the access-time throw.
    void s.length;
    return s;
  } catch {
    return null;
  }
}

export type DraftStatus = "idle" | "saved" | "off" | "too-long";

export function useDraftAutosave({
  userId,
  promptId,
  content,
  elapsedSeconds,
  enabled,
}: {
  userId: string | null;
  promptId: string | null;
  content: string;
  elapsedSeconds: number;
  /** False while the text is over the submittable limit, or the session is loading. */
  enabled: boolean;
}) {
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [offered, setOffered] = useState<Draft | null>(null);

  // Mirrored so the debounce effect does not depend on them. Depending on
  // elapsedSeconds would reschedule the timer every tick, so it would never fire
  // while the clock was running - which is exactly when someone is typing.
  const contentRef = useRef(content);
  const elapsedRef = useRef(elapsedSeconds);
  // Synced in an effect rather than during render: writing a ref while rendering is
  // not safe under concurrent rendering, where a render can be thrown away.
  useEffect(() => {
    contentRef.current = content;
    elapsedRef.current = elapsedSeconds;
  });

  const save = useCallback(() => {
    if (!userId || !promptId || !enabled) return;
    const storage = safeStorage();
    if (!storage) {
      setStatus("off");
      return;
    }
    const text = contentRef.current;
    if (!text.trim()) {
      // An empty draft is worse than none: it would offer the user nothing.
      clearDraft(storage, userId, promptId);
      return;
    }
    const result = writeDraft(storage, {
      v: 1,
      userId,
      promptId,
      content: text,
      elapsedSeconds: elapsedRef.current,
      updatedAt: Date.now(),
    });
    if (result.ok) {
      setStatus("saved");
      return;
    }
    if (result.reason === "quota") {
      // Make room once, then give up rather than retrying on every keystroke.
      pruneDrafts(storage, userId);
      const retry = writeDraft(storage, {
        v: 1,
        userId,
        promptId,
        content: text,
        elapsedSeconds: elapsedRef.current,
        updatedAt: Date.now(),
      });
      setStatus(retry.ok ? "saved" : "off");
      return;
    }
    setStatus("off");
  }, [userId, promptId, enabled]);

  /** Offer whatever was left for this task, and tidy up expired entries. */
  useEffect(() => {
    if (!userId || !promptId) return;
    let cancelled = false;
    // Deferred by a microtask: reading the store is a genuine external-system read,
    // but doing it in the effect body would set state inside the same commit and
    // cascade a second render for every task selection.
    queueMicrotask(() => {
      if (cancelled) return;
      const storage = safeStorage();
      if (!storage) {
        setStatus("off");
        return;
      }
      pruneDrafts(storage, userId);
      const existing = readDraft(storage, userId, promptId);
      setOffered(existing && existing.content.trim() ? existing : null);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, promptId]);

  /** Debounced save. Only `content` moves it; elapsed time rides along at fire time. */
  useEffect(() => {
    if (!userId || !promptId || !enabled) return;
    const id = setTimeout(save, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [content, userId, promptId, enabled, save]);

  /**
   * Flush on the way out. `pagehide` and `visibilitychange` rather than
   * `beforeunload`, which is unreliable on mobile and blocks the back/forward cache.
   */
  useEffect(() => {
    if (!userId || !promptId) return;
    const flush = () => save();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [userId, promptId, save]);

  const discard = useCallback(() => {
    setOffered(null);
    if (!userId || !promptId) return;
    const storage = safeStorage();
    if (storage) clearDraft(storage, userId, promptId);
  }, [userId, promptId]);

  const clear = useCallback(
    (targetPromptId?: string) => {
      const id = targetPromptId ?? promptId;
      if (!userId || !id) return;
      const storage = safeStorage();
      if (storage) clearDraft(storage, userId, id);
      setOffered(null);
      setStatus("idle");
    },
    [userId, promptId],
  );

  return { status, setStatus, offered, save, discard, clear };
}

function relativeTime(from: number): string {
  const minutes = Math.round((Date.now() - from) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * Offers a saved draft rather than restoring it. Text appearing that the user did not
 * type in this session is startling and there is no undo; ignoring this banner costs
 * them nothing, which is not true of silently applying it.
 */
export function DraftNotice({
  draft,
  onRestore,
  onDiscard,
}: {
  draft: Draft;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  const words = draft.content.trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/5 p-3">
      <p className="text-sm">
        You have an unsaved draft for this task from{" "}
        {relativeTime(draft.updatedAt)} ({words} word{words === 1 ? "" : "s"}).
      </p>
      <div className="flex shrink-0 gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onDiscard}>
          Discard
        </Button>
        <Button type="button" size="sm" onClick={onRestore}>
          Restore
        </Button>
      </div>
    </div>
  );
}

/** One quiet line under the textarea; never a toast, and never blocking. */
export function DraftStatusLine({ status }: { status: DraftStatus }) {
  if (status === "off") {
    return (
      <span className="text-xs text-muted-foreground">
        Autosave is off — this browser is blocking storage.
      </span>
    );
  }
  if (status === "saved") {
    return <span className="text-xs text-muted-foreground">Draft saved</span>;
  }
  return null;
}
