import type { LevelRubric } from "@/lib/rubrics/types";

/**
 * Server-side limits on what can reach a paid model call.
 *
 * The character cap is the load-bearing one. `countWords` splits on whitespace, so a
 * two-megabyte string with no spaces in it counts as ONE word and passes any
 * word-based check untouched. The word cap is pedagogical; this one is the defence.
 */

/** Whole request body. An essay submission is a few kB; anything larger is not one. */
export const MAX_BODY_BYTES = 16 * 1024;

/**
 * Hard character stop, independent of level. A 100-word B1 essay runs to roughly 700
 * characters, so this is about seven times the longest legitimate submission and caps
 * the worst case at a little over a thousand input tokens.
 */
export const MAX_ESSAY_CHARS = 5000;

/**
 * How far past a level's `maxWords` a submission may go before it is refused. telc
 * does not fail a candidate for overshooting the word range, and the write page only
 * colours the counter, so rejecting at exactly `maxWords` would reject honest work.
 * Three times the limit is not overshoot.
 */
export const WORD_TOLERANCE = 3;

/**
 * Returns a message to show the user, or null if the essay is within limits.
 * Pure, so it can be tested without a request or a database.
 */
export function checkEssayLength(
  content: string,
  rubric: Pick<LevelRubric, "maxWords">,
  wordCount: number,
): string | null {
  if (content.length > MAX_ESSAY_CHARS) {
    return `Your text is ${content.length} characters. The maximum is ${MAX_ESSAY_CHARS}.`;
  }
  // A level may set a floor and no ceiling — telc B2 asks only for "mindestens 150
  // Wörter". There is then no word limit to enforce, and MAX_ESSAY_CHARS above remains
  // the actual defence. Multiplying a null by the tolerance would have made the limit 0
  // and refused every B2 submission.
  if (rubric.maxWords === null) return null;
  const maxWords = rubric.maxWords * WORD_TOLERANCE;
  if (wordCount > maxWords) {
    return `Your text is ${wordCount} words. For this level the maximum accepted is ${maxWords}.`;
  }
  return null;
}

/**
 * Whether a declared Content-Length is too large to bother parsing. A missing or
 * unparseable header is allowed through — the body is length-checked after reading
 * it, and this is only the cheap early exit.
 */
export function exceedsBodyLimit(contentLength: string | null): boolean {
  if (!contentLength) return false;
  const bytes = Number(contentLength);
  return Number.isFinite(bytes) && bytes > MAX_BODY_BYTES;
}
