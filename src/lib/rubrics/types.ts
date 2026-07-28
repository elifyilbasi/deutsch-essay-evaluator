import type { Institute, Level } from "@/generated/prisma/client";

export type BandLetter = "A" | "B" | "C" | "D";

/** How thoroughly one Leitpunkt / Inhaltspunkt was treated. */
export type LeitpunktStatus = "ADDRESSED" | "PARTIAL" | "MISSING";

/**
 * telc A1 marks every Inhaltspunkt on its own (3 / 1,5 / 0) instead of banding a
 * single criterion by how many were covered, so the per-Leitpunkt statuses carry
 * the content marks and `criteria` holds only what is left. Rubrics without this
 * field score content through an ordinary banded criterion, as telc B1 does.
 */
export type ContentPointScoring = {
  /** Label for the summed content marks where a criterion label would go. */
  label: string;
  description: string;
  /** Marks awarded for one Inhaltspunkt, by the status the examiner assigned. */
  points: Record<LeitpunktStatus, number>;
  /** The official wording for each mark, shown to the examiner and the learner. */
  descriptors: Record<LeitpunktStatus, string>;
};

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
   * Set only where an institute states that a D on this one criterion voids the
   * whole task. Neither telc A1 nor telc B1 has such a rule — B1 says the opposite
   * outright ("wird Kriterium III mit D bewertet, können die Kriterien I und II mit
   * C, B oder A bewertet sein"), and a task-wide zero there comes solely from
   * `themaVerfehltZeroesTask`. Do not set this on a level without a citation.
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
  /**
   * Names the exam part this score covers, e.g. "Schreiben, Teil 2". Shown next to
   * the total so a score is never mistaken for the subtest or the whole exam.
   */
  scaleLabel: string;
  /**
   * One or two sentences placing that total in the exam, in German. Per level
   * because the parts, totals and pass rules differ between them — telc B1's 45
   * points are a subtest in their own right, telc A1's 10 are half of one.
   */
  scaleNote: string;
  /** Set where the institute marks each Inhaltspunkt separately (telc A1). */
  contentPointScoring?: ContentPointScoring;
  /**
   * What the three coverage statuses mean at this level, in the institute's own
   * terms. Levels differ sharply here — telc B1 counts a Leitpunkt as erfüllt on a
   * single short sentence — and the generic fallback in the evaluator is stricter
   * than either grid, so a level that has a stated threshold must say so. Ignored
   * where `contentPointScoring` is set: its descriptors already carry the wording.
   */
  leitpunktStatusGuidance?: Record<LeitpunktStatus, string>;
  /**
   * Whether "Thema verfehlt" is an override that zeroes the task. True for telc
   * B1, which states the rule explicitly. False for telc A1, whose grid has no
   * such override — an off-topic text simply earns 0 on every Inhaltspunkt.
   */
  themaVerfehltZeroesTask: boolean;
  /** Raw criterion points are multiplied by this to reach the official scale. */
  scoreMultiplier: number;
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

/**
 * Highest raw (pre-multiplier) score obtainable: each criterion's best band, plus
 * the content marks where those are awarded per Inhaltspunkt. The latter depends on
 * how many Leitpunkte the task sets, which is a property of the task, not the rubric
 * — telc A1's 10 points are 3 Inhaltspunkte x 3 plus 1 for kommunikative Gestaltung.
 */
export function maxRawScore(rubric: LevelRubric, leitpunktCount = 0): number {
  const criteriaMax = rubric.criteria.reduce(
    (sum, c) => sum + Math.max(...c.bands.map((b) => b.points)),
    0,
  );
  const contentMax = rubric.contentPointScoring
    ? leitpunktCount * Math.max(...Object.values(rubric.contentPointScoring.points))
    : 0;
  return criteriaMax + contentMax;
}

export type ScoreBreakdown = {
  raw: number;
  total: number;
  maxTotal: number;
  /** Set when a zero-out rule fired, naming the reason. */
  zeroedReason: string | null;
};

/**
 * Turns the examiner's band letters into the official score, applying the rules
 * deterministically rather than trusting the model to do arithmetic:
 *  - "Thema verfehlt" scores 0 where the level says it does
 *  - a D in a zeroing criterion scores 0 overall, where a level declares one
 *  - content marks awarded per Inhaltspunkt are added from the coverage statuses
 */
export function scoreFromBands(params: {
  rubric: LevelRubric;
  bands: Record<string, BandLetter>;
  themaVerfehlt: boolean;
  /** One status per Leitpunkt; only consulted when the rubric marks per Inhaltspunkt. */
  leitpunktStatuses?: LeitpunktStatus[];
}): ScoreBreakdown {
  const { rubric, bands, themaVerfehlt } = params;
  const statuses = params.leitpunktStatuses ?? [];
  const maxRaw = maxRawScore(rubric, statuses.length);
  const maxTotal = maxRaw * rubric.scoreMultiplier;

  if (themaVerfehlt && rubric.themaVerfehltZeroesTask) {
    return { raw: 0, total: 0, maxTotal, zeroedReason: "Thema verfehlt" };
  }

  for (const criterion of rubric.criteria) {
    if (criterion.zeroesWholeTask && bands[criterion.key] === "D") {
      return {
        raw: 0,
        total: 0,
        maxTotal,
        zeroedReason: `${criterion.label} mit D bewertet`,
      };
    }
  }

  let raw = rubric.criteria.reduce((sum, criterion) => {
    const band = criterion.bands.find((b) => b.band === bands[criterion.key]);
    return sum + (band?.points ?? 0);
  }, 0);

  const contentPoints = rubric.contentPointScoring;
  if (contentPoints) {
    raw += statuses.reduce((sum, status) => sum + (contentPoints.points[status] ?? 0), 0);
  }


  return { raw, total: raw * rubric.scoreMultiplier, maxTotal, zeroedReason: null };
}
