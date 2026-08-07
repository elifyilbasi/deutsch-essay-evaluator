import type { LeitpunktCoverage } from "@/lib/gemini";
import type { LeitpunktStatus } from "@/lib/rubrics/types";

/**
 * How a coverage row should read, which is not always its raw status.
 *
 * `NOT_NEEDED` is the extra one: a point the candidate left alone once the level's
 * requirement was already satisfied. The model is right to report it as MISSING — the
 * list exists to show what the letter did and did not take up — but showing it in the
 * failure colour under a heading that reads "3 of 3 required points fully covered" has
 * the page contradicting itself, and tells a candidate who answered correctly that they
 * got something wrong.
 */
export type CoverageTone = LeitpunktStatus | "NOT_NEEDED";

export type CoverageReading = {
  covered: number;
  /** Clamped for display: covering all four of a four-point B2 task is not "4 of 3". */
  required: number;
  ownCovered: number;
  requirementMet: boolean;
  /** One tone per coverage entry, in the order given. */
  tones: CoverageTone[];
};

/**
 * Read a coverage list against the number of points the level actually marks.
 *
 * `expectedTotal` is that number where it is lower than the count printed on the task:
 * telc B2 marks three of four and lets one of the three be an aspect of the candidate's
 * own, and telc A2 prints four Inhaltspunkte and marks the best three. Omit it where
 * every printed point is required, and the list reverts to needing all of them.
 *
 * Pure and separate from the component so the rule can be tested without a DOM — the
 * scoring side already excludes skipped points (see contentPointMarks in lib/gemini and
 * scoreFromBands in lib/rubrics/types); this keeps the display honest about the same
 * thing.
 */
export function readCoverage(
  coverage: Pick<LeitpunktCoverage, "status" | "selfChosen">[],
  expectedTotal?: number,
): CoverageReading {
  const covered = coverage.filter((c) => c.status === "ADDRESSED").length;
  const required = expectedTotal ?? coverage.length;
  const ownCovered = coverage.filter(
    (c) => c.selfChosen && c.status === "ADDRESSED",
  ).length;
  // Once enough points are treated, whatever is left over was optional all along. Below
  // the requirement those same rows stay failures, because there they really are short.
  const requirementMet = covered >= required;

  return {
    covered,
    required,
    ownCovered,
    requirementMet,
    tones: coverage.map((c) =>
      requirementMet && c.status !== "ADDRESSED" ? "NOT_NEEDED" : c.status,
    ),
  };
}
