import type { Level } from "@/generated/prisma/client";

/**
 * Per-level progress across a learner's attempts.
 *
 * Everything here is a ratio rather than a raw score, because the scales differ: telc
 * B1 is out of 45 and A1/A2 out of 10, and each evaluation stores its own maximum so
 * historical rows survive rubric changes. Averaging raw scores across levels, or even
 * across two attempts at one level scored under different rubric versions, produces a
 * number that means nothing.
 */

export type AttemptInput = {
  level: Level;
  createdAt: Date;
  evaluation: { overallScore: number; maxScore: number; zeroedReason: string | null } | null;
};

export type Attempt = {
  createdAt: Date;
  /** 0..1 */
  ratio: number;
  score: number;
  maxScore: number;
  zeroed: boolean;
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
};

const ratioOf = (score: number, max: number) => (max > 0 ? score / max : 0);

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
        createdAt: essay.createdAt,
        ratio: ratioOf(essay.evaluation.overallScore, essay.evaluation.maxScore),
        score: essay.evaluation.overallScore,
        maxScore: essay.evaluation.maxScore,
        zeroed: essay.evaluation.zeroedReason !== null,
      });
    }
    byLevel.set(essay.level, bucket);
  }

  const out: LevelProgress[] = [];
  for (const [level, { scored, total }] of byLevel) {
    if (scored.length === 0) continue;
    const attempts = [...scored].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const best = attempts.reduce((a, b) => (b.ratio > a.ratio ? b : a));
    out.push({
      level,
      attempts,
      totalAttempts: total,
      best,
      latest: attempts[attempts.length - 1],
      averageRatio: attempts.reduce((sum, a) => sum + a.ratio, 0) / attempts.length,
      zeroedCount: attempts.filter((a) => a.zeroed).length,
    });
  }

  // A1 before A2 before B1, so the list reads the way a learner progresses.
  return out.sort((a, b) => a.level.localeCompare(b.level));
}

/** Whole percent, for display. */
export function asPercent(ratio: number): number {
  return Math.round(ratio * 100);
}
