/**
 * mm:ss for a duration in seconds.
 *
 * Deliberately a plain module, not part of the "use client" timer component: the essay
 * detail page is a Server Component and calls this directly, and a function exported
 * from a client module can only be rendered or passed as a prop, never invoked on the
 * server. Keeping it here lets both sides share one implementation.
 */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
