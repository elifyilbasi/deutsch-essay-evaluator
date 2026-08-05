export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * A task's length requirement as printed on its paper.
 *
 * `maxWords` is null where the level sets a floor and no ceiling — telc B2 asks only for
 * "Schreiben Sie mindestens 150 Wörter". Rendering that as a range would put back the
 * invented upper bound the rubric deliberately does not have, and colour a perfectly
 * legitimate 300-word letter as an error.
 */
export function formatWordRange(minWords: number, maxWords: number | null): string {
  return maxWords === null ? `mindestens ${minWords}` : `${minWords}-${maxWords}`;
}

/** Whether a count misses the task's requirement. With no ceiling, only being short can. */
export function wordsOutOfRange(
  count: number,
  minWords: number,
  maxWords: number | null,
): boolean {
  return count < minWords || (maxWords !== null && count > maxWords);
}
