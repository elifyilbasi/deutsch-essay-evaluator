import type { Level } from "@/generated/prisma/client";
import { LEVELS } from "@/lib/writeParams";

/**
 * Per-level progress across a learner's attempts.
 *
 * Everything here is a ratio rather than a raw score, because the scales differ: telc
 * B1 is out of 45 and A1/A2 out of 10, and each evaluation stores its own maximum so
 * historical rows survive rubric changes. Averaging raw scores across levels, or even
 * across two attempts at one level scored under different rubric versions, produces a
 * number that means nothing.
 */

/** 60% is telc's pass threshold across the written exam. */
export const PASS_RATIO = 0.6;

export const isPass = (ratio: number) => ratio >= PASS_RATIO;

export type AttemptInput = {
  id: string;
  level: Level;
  createdAt: Date;
  evaluation: { overallScore: number; maxScore: number; zeroedReason: string | null } | null;
};

export type Attempt = {
  /** The essay this attempt scored, so a chart mark can link back to its feedback. */
  id: string;
  createdAt: Date;
  /** 0..1 */
  ratio: number;
  score: number;
  maxScore: number;
  zeroed: boolean;
  /**
   * Why it was zeroed, verbatim. Kept alongside the boolean so a caller can say which
   * rule fired — it is not always "Thema verfehlt", a single D-graded criterion zeroes
   * an essay too.
   */
  zeroedReason: string | null;
};

export type LevelProgress = {
  level: Level;
  /** Evaluated attempts, oldest first — the order a trend should be read in. */
  attempts: Attempt[];
  /** Includes attempts still awaiting an evaluation, which carry no score. */
  totalAttempts: number;
  best: Attempt;
  latest: Attempt;
  /** Mean ratio over scored attempts, zeroed ones included: they are real results. */
  averageRatio: number;
  /**
   * How many were zeroed by a rule such as "Thema verfehlt". Reported separately
   * because they are legitimate zeros that drag an average, and a learner reading a
   * low average deserves to know one off-topic essay caused it.
   */
  zeroedCount: number;
  /**
   * What `deltaRatio` measures against: the most recent earlier attempt that was NOT
   * zeroed by a rule. Null when there is none, or when `latest` is itself zeroed.
   *
   * A rule zero is not a performance level, so it cannot serve as a yardstick. Measured
   * against a "Thema verfehlt" 0, a perfectly ordinary 87% reports "+87 since last" — a
   * triumph the learner did not have. Same reasoning as `zeroedCount`: a zeroed attempt
   * is a real result worth counting, and a misleading thing to compare to.
   */
  deltaBaseline: Attempt | null;
  /**
   * Movement from `deltaBaseline` to `latest`, null when there is no baseline.
   * Subtracted here rather than in a component because it has to be a difference of
   * RATIOS: 9/10 followed by 12/15 is a drop even though the raw number went up, and
   * that only stays true in the module that owns the scale.
   */
  deltaRatio: number | null;
  /** Scored attempts at or above the pass mark — more actionable than a mean. */
  passedCount: number;
};

export const ratioOf = (score: number, max: number) => (max > 0 ? score / max : 0);

/**
 * Groups attempts by level, newest-first input or not. Levels with no scored attempt
 * are omitted: there is no progress to show, and the essay list below already says
 * the attempt exists.
 */
export function progressByLevel(essays: AttemptInput[]): LevelProgress[] {
  const byLevel = new Map<Level, { scored: Attempt[]; total: number }>();

  for (const essay of essays) {
    const bucket = byLevel.get(essay.level) ?? { scored: [], total: 0 };
    bucket.total += 1;
    if (essay.evaluation) {
      bucket.scored.push({
        id: essay.id,
        createdAt: essay.createdAt,
        ratio: ratioOf(essay.evaluation.overallScore, essay.evaluation.maxScore),
        score: essay.evaluation.overallScore,
        maxScore: essay.evaluation.maxScore,
        zeroed: essay.evaluation.zeroedReason !== null,
        zeroedReason: essay.evaluation.zeroedReason,
      });
    }
    byLevel.set(essay.level, bucket);
  }

  const out: LevelProgress[] = [];
  for (const [level, { scored, total }] of byLevel) {
    if (scored.length === 0) continue;
    const attempts = [...scored].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const best = attempts.reduce((a, b) => (b.ratio > a.ratio ? b : a));
    const latest = attempts[attempts.length - 1];
    // Nothing to compare a zeroed latest to either: "-100 since last" describes the rule
    // that fired, not the writing. The zeroed badge already reports it.
    const deltaBaseline = latest.zeroed
      ? null
      : (attempts.slice(0, -1).findLast((a) => !a.zeroed) ?? null);
    out.push({
      level,
      attempts,
      totalAttempts: total,
      best,
      latest,
      averageRatio: attempts.reduce((sum, a) => sum + a.ratio, 0) / attempts.length,
      zeroedCount: attempts.filter((a) => a.zeroed).length,
      deltaBaseline,
      deltaRatio: deltaBaseline === null ? null : latest.ratio - deltaBaseline.ratio,
      passedCount: attempts.filter((a) => isPass(a.ratio)).length,
    });
  }

  // A1 before A2 before B1, so the list reads the way a learner progresses.
  return out.sort((a, b) => a.level.localeCompare(b.level));
}

/**
 * The most recent `size` attempts, oldest first — what a chart plots.
 *
 * Deliberately separate from `progressByLevel` rather than a slice inside it: the
 * aggregates above are computed over everything fetched, so narrowing the plot must
 * never quietly redefine `best`, `averageRatio` or `totalAttempts`.
 */
export function plotWindow(attempts: Attempt[], size = 14): Attempt[] {
  return size > 0 ? attempts.slice(-size) : [];
}

export type LevelSlot = {
  level: Level;
  progress: LevelProgress | null;
  /**
   * Attempts at this level that the caller's window did not reach. The dashboard reads
   * only the most recent essays, so an empty `progress` means "none in that window", not
   * "never attempted" — and a cell that says "No attempts yet" to someone with twenty
   * older essays at that level is simply wrong. Zero when the caller supplies no counts.
   */
  attemptsOutsideWindow: number;
};

/**
 * One slot per level the write wizard actually offers, in ladder order, whether or not
 * it has been attempted.
 *
 * `progressByLevel` drops levels with nothing scored, which is right for an aggregate
 * but wrong for a grid: a level you have not started is information — it is what comes
 * next — and a layout that reflows as levels appear shifts under the reader. Padding
 * here rather than there keeps both behaviours available and neither one implicit.
 *
 * Reads LEVELS so the grid and the wizard cannot disagree about which levels exist.
 */
export function levelSlots(
  progress: LevelProgress[],
  /**
   * Total attempts per level over the learner's whole history, where the caller can
   * cheaply supply it. Without it a slot cannot tell "never attempted" from "nothing in
   * the window I read", and the card claims the former.
   */
  totalByLevel: Partial<Record<Level, number>> = {},
): LevelSlot[] {
  const byLevel = new Map(progress.map((p) => [p.level, p]));
  return LEVELS.filter((l) => l.enabled).map((l) => {
    const level = l.value as Level;
    const inWindow = byLevel.get(level) ?? null;
    return {
      level,
      progress: inWindow,
      // Floored at zero: the counts and the window are separate queries, so a submission
      // landing between them must not produce a negative remainder.
      attemptsOutsideWindow: Math.max(
        0,
        (totalByLevel[level] ?? 0) - (inWindow?.totalAttempts ?? 0),
      ),
    };
  });
}

/** Whole percent, for display. */
export function asPercent(ratio: number): number {
  return Math.round(ratio * 100);
}
