import type { Correction } from "@/lib/gemini";

export type AnchoredCorrection = Correction & { index: number };

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "correction"; text: string; correction: AnchoredCorrection };

export type AnchorResult = {
  segments: Segment[];
  /** Corrections whose `original` couldn't be located; shown as a plain list instead. */
  unanchored: AnchoredCorrection[];
};

type Range = { start: number; end: number; correction: AnchoredCorrection };

/**
 * Collapses whitespace runs to a single space while keeping a map back to the
 * original offsets, so a match found in the normalised text can be translated
 * into a highlight range over the untouched essay.
 */
function normalise(text: string): { text: string; map: number[] } {
  const chars: string[] = [];
  const map: number[] = [];
  let inWhitespace = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (/\s/.test(char)) {
      if (!inWhitespace && chars.length > 0) {
        chars.push(" ");
        map.push(i);
      }
      inWhitespace = true;
      continue;
    }
    inWhitespace = false;
    chars.push(char);
    map.push(i);
  }

  // Drop a trailing space so it never becomes part of a match.
  if (chars.at(-1) === " ") {
    chars.pop();
    map.pop();
  }

  return { text: chars.join(""), map };
}

/**
 * Finds `needle` in `haystack` at or after `from`, trying progressively looser
 * comparisons. Returns offsets into the ORIGINAL essay, or null.
 *
 * The tiers matter because the model quotes the essay back to us by hand: it
 * usually copies verbatim, sometimes reflows whitespace across a line break, and
 * occasionally changes the capitalisation of the first word.
 */
function findRange(
  essay: string,
  normalised: { text: string; map: number[] },
  needle: string,
  from: number,
): { start: number; end: number } | null {
  const trimmed = needle.trim();
  if (!trimmed) return null;

  // Tier 1: exact substring of the untouched essay.
  const exact = essay.indexOf(trimmed, from);
  if (exact !== -1) {
    return { start: exact, end: exact + trimmed.length };
  }

  // Tiers 2 and 3 work in normalised space, so translate `from` into it.
  const normFrom = normalised.map.findIndex((original) => original >= from);
  const searchFrom = normFrom === -1 ? normalised.text.length : normFrom;

  const normNeedle = normalise(trimmed).text;
  if (!normNeedle) return null;

  const toOriginal = (start: number, end: number) => {
    const startOriginal = normalised.map[start];
    const lastOriginal = normalised.map[end - 1];
    if (startOriginal === undefined || lastOriginal === undefined) return null;
    return { start: startOriginal, end: lastOriginal + 1 };
  };

  // Tier 2: whitespace-insensitive.
  const loose = normalised.text.indexOf(normNeedle, searchFrom);
  if (loose !== -1) {
    return toOriginal(loose, loose + normNeedle.length);
  }

  // Tier 3: also case-insensitive.
  const insensitive = normalised.text
    .toLowerCase()
    .indexOf(normNeedle.toLowerCase(), searchFrom);
  if (insensitive !== -1) {
    return toOriginal(insensitive, insensitive + normNeedle.length);
  }

  return null;
}

/**
 * Locates each correction inside the essay and splits the text into renderable
 * segments.
 *
 * Two details worth knowing:
 *  - Repeated phrases: each search starts after the previous match, so a phrase
 *    corrected twice highlights two different occurrences rather than the same one.
 *  - Overlaps: a correction whose range intersects one already claimed is dropped
 *    to `unanchored` — rendering nested highlights is worse than a footnote.
 */
export function anchorCorrections(essay: string, corrections: Correction[]): AnchorResult {
  const indexed: AnchoredCorrection[] = corrections.map((c, index) => ({ ...c, index }));

  if (!essay || indexed.length === 0) {
    return {
      segments: essay ? [{ kind: "text", text: essay }] : [],
      unanchored: indexed,
    };
  }

  const normalised = normalise(essay);
  const ranges: Range[] = [];
  const unanchored: AnchoredCorrection[] = [];

  // Corrections arrive in the order they appear in the text, so a moving cursor
  // resolves duplicates correctly in the common case.
  let cursor = 0;

  for (const correction of indexed) {
    const found =
      findRange(essay, normalised, correction.original, cursor) ??
      // Fall back to a search from the start: the model occasionally lists a
      // correction out of order, and matching late is better than not at all.
      findRange(essay, normalised, correction.original, 0);

    if (!found) {
      unanchored.push(correction);
      continue;
    }

    const overlaps = ranges.some((r) => found.start < r.end && r.start < found.end);
    if (overlaps) {
      unanchored.push(correction);
      continue;
    }

    ranges.push({ ...found, correction });
    cursor = found.end;
  }

  ranges.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let position = 0;

  for (const range of ranges) {
    if (range.start > position) {
      segments.push({ kind: "text", text: essay.slice(position, range.start) });
    }
    segments.push({
      kind: "correction",
      text: essay.slice(range.start, range.end),
      correction: range.correction,
    });
    position = range.end;
  }

  if (position < essay.length) {
    segments.push({ kind: "text", text: essay.slice(position) });
  }

  return { segments, unanchored };
}
