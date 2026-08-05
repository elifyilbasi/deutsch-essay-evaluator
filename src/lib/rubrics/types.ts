import type { Institute, Level } from "@/generated/prisma/client";

/**
 * No telc grid this project implements defines a band beyond A.
 *
 * An "A*" was carried here for a while, taken from a Klett-Langenscheidt Modelltest
 * (2013) that described one for telc B2. telc's own published B2 Übungstest
 * (überarbeitete Auflage 2019) has no such band: its criteria table reads "A B C D*",
 * where the asterisk is a footnote marker for the Thema-verfehlt rule. The grid decides
 * what letters exist, not a publisher's reproduction of an older format.
 */
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
  /**
   * How many Inhaltspunkte are actually marked, where the task offers more than the
   * candidate has to answer. telc A2 prints four and says "Wählen Sie drei aus", so
   * only three are marked (the Antwortbogen has 1-2-3-K) and the candidate chooses
   * which — the best three statuses count and the point left out costs nothing.
   * Omit where every Leitpunkt is marked, as at telc A1.
   */
  counted?: number;
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

/**
 * A level where the candidate may substitute content of their own for some of the
 * printed Leitpunkte. telc B2 marks "die Berücksichtigung von mindestens zwei
 * Leitpunkten und gegebenenfalls weiterer inhaltlicher Aspekte", and its papers say so
 * outright: "entweder a) mindestens drei der folgenden Punkte oder b) mindestens zwei
 * der folgenden Punkte und einen weiteren Aspekt Ihrer Wahl."
 *
 * Without this, a candidate who legitimately takes option (b) reads as having MISSED two
 * Leitpunkte — the coverage list would show two gaps that the grid does not penalise.
 * Distinct from telc A2's `counted`, which picks the best N of the printed points and
 * has no notion of content the candidate brought themselves.
 */
export type SelfChosenAspects = {
  /** How many of the printed Leitpunkte must be treated regardless. */
  minLeitpunkte: number;
  /**
   * How many treated points the level expects in total, printed or self-chosen. Below
   * this the coverage is short whichever way the candidate made it up.
   */
  expectedTotal: number;
  /** The level's own wording, for the prompt and the examiner-facing description. */
  guidance: string;
};

export type LevelRubric = {
  level: Level;
  minWords: number;
  /**
   * Null where the level sets a floor and no ceiling — telc B2 says only "Schreiben Sie
   * mindestens 150 Wörter". Load-bearing rather than cosmetic: `checkEssayLength`
   * refuses a submission past `maxWords` x tolerance, so inventing a ceiling here would
   * reject legitimate long letters. `MAX_ESSAY_CHARS` stays the real defence.
   */
  maxWords: number | null;
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
  /** Set where the candidate may bring aspects of their own (telc B2). */
  selfChosenAspects?: SelfChosenAspects;
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
 * Where the level marks only some of the points offered (telc A2: four printed,
 * three chosen), the extra ones raise neither the score nor the maximum.
 */
export function maxRawScore(rubric: LevelRubric, leitpunktCount = 0): number {
  const criteriaMax = rubric.criteria.reduce(
    (sum, c) => sum + Math.max(...c.bands.map((b) => b.points)),
    0,
  );
  const content = rubric.contentPointScoring;
  const contentMax = content
    ? countedPoints(content, leitpunktCount) * Math.max(...Object.values(content.points))
    : 0;
  return criteriaMax + contentMax;
}

/**
 * The band a criterion awards for the letter an examiner returned.
 *
 * One lookup, used by both `scoreFromBands` and `resultFromVerdict`. They each had their
 * own before, and disagreed: given a letter a criterion did not define, the scorer found
 * nothing and awarded 0 while the breakdown fell through to `bands.at(-1)` and printed D.
 * A single function cannot contradict itself, which is the whole point of it — the
 * response schema has to present ONE band enum for every criterion, because the criteria
 * come back as a homogeneous array and a JSON schema cannot vary an item's enum by key.
 *
 * Returns undefined for an unknown or absent letter, leaving the caller to decide: the
 * scorer treats it as no marks, the breakdown as the bottom band.
 */
export function resolveBand(
  criterion: CriterionDefinition,
  letter: BandLetter | undefined,
): Band | undefined {
  if (letter === undefined) return undefined;
  return criterion.bands.find((b) => b.band === letter);
}

/** How many Inhaltspunkte are marked for a task offering `offered` of them. */
function countedPoints(content: ContentPointScoring, offered: number): number {
  return content.counted === undefined ? offered : Math.min(content.counted, offered);
}

/**
 * The content marks for one submission: what was earned, out of what, over how many
 * Inhaltspunkte. Single source of truth so the score and the breakdown that explains
 * it cannot drift apart — telc A2 prints four points and marks the best three, and a
 * breakdown that counted all four would contradict its own total.
 */
export function contentPointMarks(
  content: ContentPointScoring,
  statuses: LeitpunktStatus[],
  /**
   * How many Leitpunkte the TASK sets. Separate from `statuses.length`, which is only
   * how many the examiner returned: deriving the maximum from the examiner's output
   * let a short reply shrink its own denominator.
   */
  offered: number,
): { earned: number; max: number; counted: number } {
  const counted = countedPoints(content, offered);
  const earned = statuses
    .map((status) => content.points[status] ?? 0)
    .sort((a, b) => b - a)
    .slice(0, counted)
    .reduce((sum, m) => sum + m, 0);
  return { earned, max: counted * Math.max(...Object.values(content.points)), counted };
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
  /**
   * How many Leitpunkte the task sets. Required, not defaulted: the maximum is a
   * property of the task, and the previous code took it from the examiner's coverage
   * array instead, so a verdict listing three points for a four-point task scored the
   * candidate out of a smaller total. Two attempts at one task could end up with
   * different denominators. Requiring it is what stops a caller substituting the
   * model's count again.
   */
  leitpunktCount: number;
  /** One status per Leitpunkt; only consulted when the rubric marks per Inhaltspunkt. */
  leitpunktStatuses?: LeitpunktStatus[];
}): ScoreBreakdown {
  const { rubric, bands, themaVerfehlt, leitpunktCount } = params;
  const statuses = params.leitpunktStatuses ?? [];
  const maxRaw = maxRawScore(rubric, leitpunktCount);
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
    // Resolved, not matched exactly: a letter the criterion does not define still has
    // to score what the grid intends. See resolveBand.
    const band = resolveBand(criterion, bands[criterion.key]);
    return sum + (band?.points ?? 0);
  }, 0);

  const contentPoints = rubric.contentPointScoring;
  if (contentPoints) {
    raw += contentPointMarks(contentPoints, statuses, leitpunktCount).earned;
  }

  return { raw, total: raw * rubric.scoreMultiplier, maxTotal, zeroedReason: null };
}
