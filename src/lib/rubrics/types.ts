import type { Institute, Level } from "@/generated/prisma/client";

export type BandLetter = "A" | "B" | "C" | "D";

/** One selectable grade band within a criterion, with its official point value. */
export type Band = {
  band: BandLetter;
  points: number;
  descriptor: string;
};

export type CriterionDefinition = {
  key: string;
  label: string;
  description: string;
  bands: Band[];
  /**
   * telc B1 rule: if Kriterium I (Leitpunkte) or Kriterium III (formale
   * Richtigkeit) is graded D, the whole letter is scored 0.
   */
  zeroesWholeTask?: boolean;
};

export type LevelRubric = {
  level: Level;
  minWords: number;
  maxWords: number;
  /** Time allowed for this task in the real exam, in minutes. */
  timeLimitMinutes: number;
  criteria: CriterionDefinition[];
  /** Raw criterion points are multiplied by this to reach the official scale. */
  scoreMultiplier: number;
  /** Zusatzpunkte available for above-average performance. */
  maxBonusPoints: number;
  bonusGuidance: string;
  guidance: string;
  /**
   * True only where the band values are transcribed from official material.
   * False means the shape is modelled on the official grid but the numbers
   * are an approximation pending a real grid for that level.
   */
  verified: boolean;
};

export type RubricLookup = Partial<Record<Level, LevelRubric>>;

export type InstituteRubrics = Partial<Record<Institute, RubricLookup>>;

/** Highest raw (pre-multiplier) score obtainable: the sum of each criterion's best band. */
export function maxRawScore(rubric: LevelRubric): number {
  return rubric.criteria.reduce(
    (sum, c) => sum + Math.max(...c.bands.map((b) => b.points)),
    0,
  );
}

export type ScoreBreakdown = {
  raw: number;
  total: number;
  maxTotal: number;
  bonusApplied: number;
  /** Set when a zero-out rule fired, naming the reason. */
  zeroedReason: string | null;
};

/**
 * Turns the examiner's band letters into the official score, applying telc's
 * rules deterministically rather than trusting the model to do arithmetic:
 *  - "Thema verfehlt" scores 0
 *  - a D in a zeroing criterion scores 0 overall
 *  - Zusatzpunkte are barred if any criterion is C or worse, or if the letter
 *    already has full marks
 */
export function scoreFromBands(params: {
  rubric: LevelRubric;
  bands: Record<string, BandLetter>;
  bonusPoints: number;
  themaVerfehlt: boolean;
}): ScoreBreakdown {
  const { rubric, bands, bonusPoints, themaVerfehlt } = params;
  const maxRaw = maxRawScore(rubric);
  const maxTotal = maxRaw * rubric.scoreMultiplier;

  if (themaVerfehlt) {
    return { raw: 0, total: 0, maxTotal, bonusApplied: 0, zeroedReason: "Thema verfehlt" };
  }

  for (const criterion of rubric.criteria) {
    if (criterion.zeroesWholeTask && bands[criterion.key] === "D") {
      return {
        raw: 0,
        total: 0,
        maxTotal,
        bonusApplied: 0,
        zeroedReason: `${criterion.label} mit D bewertet`,
      };
    }
  }

  let raw = rubric.criteria.reduce((sum, criterion) => {
    const band = criterion.bands.find((b) => b.band === bands[criterion.key]);
    return sum + (band?.points ?? 0);
  }, 0);

  const hasWeakCriterion = rubric.criteria.some(
    (c) => bands[c.key] === "C" || bands[c.key] === "D",
  );
  const bonusApplied =
    hasWeakCriterion || raw >= maxRaw
      ? 0
      : Math.min(Math.max(Math.round(bonusPoints), 0), rubric.maxBonusPoints);

  raw = Math.min(raw + bonusApplied, maxRaw);

  return { raw, total: raw * rubric.scoreMultiplier, maxTotal, bonusApplied, zeroedReason: null };
}
