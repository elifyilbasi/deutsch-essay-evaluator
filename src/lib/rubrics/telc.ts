import type { Band, LevelRubric, RubricLookup } from "./types";

/**
 * telc writing rubrics, expressed as data so new levels/institutes only require
 * new entries here (or in a sibling file), never changes to the evaluation pipeline.
 *
 * The B1 grid is transcribed from the official telc "Zertifikat Deutsch B1"
 * Übungstest (Bewertungskriterien Schriftlicher Ausdruck, pages 41-42):
 * three criteria scored in A/B/C/D bands worth 5/3/1/0 points, up to two
 * Zusatzpunkte, and the resulting total multiplied by 3 to give 45 points.
 */

const BAND_POINTS: Record<"A" | "B" | "C" | "D", number> = { A: 5, B: 3, C: 1, D: 0 };

const bands = (descriptors: Record<"A" | "B" | "C" | "D", string>): Band[] =>
  (["A", "B", "C", "D"] as const).map((band) => ({
    band,
    points: BAND_POINTS[band],
    descriptor: descriptors[band],
  }));

const B1: LevelRubric = {
  level: "B1",
  minWords: 80,
  maxWords: 100,
  // "Sie haben 30 Minuten Zeit den Brief zu schreiben." - official telc B1 Übungstest.
  timeLimitMinutes: 30,
  scoreMultiplier: 3,
  maxBonusPoints: 2,
  verified: true,
  bonusGuidance:
    "Up to two Zusatzpunkte may be suggested when the letter is above average in (1) linguistic range — vocabulary and structures, and (2) scope of content. They are forbidden if any criterion is graded C or D, or if the letter already has full marks; the scoring code enforces this, so simply report what the text deserves on its merits.",
  criteria: [
    {
      key: "leitpunkte",
      label: "Kriterium I: Berücksichtigung der Leitpunkte",
      description:
        "Count how many of the task's Leitpunkte are treated with adequate content (inhaltlich angemessen bearbeitet). A point merely named in passing does not count as adequately treated. Base this band strictly on your per-Leitpunkt findings.",
      zeroesWholeTask: true,
      bands: bands({
        A: "Alle vier vorgegebenen Leitpunkte werden inhaltlich angemessen bearbeitet.",
        B: "Drei Leitpunkte werden inhaltlich angemessen bearbeitet.",
        C: "Zwei Leitpunkte werden inhaltlich angemessen bearbeitet.",
        D: "Nur einer oder keiner der vorgegebenen Leitpunkte wird inhaltlich angemessen bearbeitet.",
      }),
    },
    {
      key: "kommunikativeGestaltung",
      label: "Kriterium II: Kommunikative Gestaltung",
      description:
        "Judge four things together: (1) a sensible ordering of the Leitpunkte, (2) the linking of sentences and utterances, (3) an expression style suited to the content and the addressee, and (4) addressee reference — date, salutation, and greeting/closing formula.",
      bands: bands({
        A: "Die kommunikative Gestaltung ist voll angemessen.",
        B: "Die kommunikative Gestaltung ist im Großen und Ganzen angemessen.",
        C: "Die kommunikative Gestaltung ist kaum noch akzeptabel.",
        D: "Die kommunikative Gestaltung ist insgesamt nicht ausreichend.",
      }),
    },
    {
      key: "formaleRichtigkeit",
      label: "Kriterium III: Formale Richtigkeit",
      description: "Judge syntax, morphology and orthography.",
      zeroesWholeTask: true,
      bands: bands({
        A: "Der Brief enthält keine oder nur vereinzelte Fehler.",
        B: "Der Brief enthält Fehler, die das Verständnis nicht beeinträchtigen.",
        C: "Der Brief enthält Fehler an zentralen Stellen, die das Verständnis erheblich beeinträchtigen.",
        D: "Der Brief enthält so viele Fehler, dass der Text kaum noch verständlich ist.",
      }),
    },
  ],
  guidance:
    "This is a telc B1 Schriftlicher Ausdruck (Brief): a reply to the letter quoted above, written in 30 minutes. Grade each criterion by choosing the band whose descriptor best fits, exactly as a telc examiner would — do not invent intermediate grades. Kriterium I is decided purely by how many Leitpunkte are adequately treated, so settle the per-Leitpunkt judgements first. Reacting to the sender's own news is part of good kommunikative Gestaltung, but never substitutes for covering the Leitpunkte.",
};

/**
 * A1 and A2 grids below are NOT transcribed from official telc material — telc
 * Start Deutsch 1/2 use a different writing format and scale. They reuse the B1
 * band shape as a stand-in so the levels remain usable, with a multiplier of 1
 * so the score is reported out of 15 rather than implying the B1 45-point scale.
 * Replace them once real grids are available (see exam-materials/README.md).
 */
const A2: LevelRubric = {
  level: "A2",
  minWords: 30,
  maxWords: 50,
  // Not taken from an official paper - adjust alongside the A2 scoring grid.
  timeLimitMinutes: 20,
  scoreMultiplier: 1,
  maxBonusPoints: 0,
  verified: false,
  bonusGuidance: "No Zusatzpunkte at this level.",
  criteria: [
    {
      key: "leitpunkte",
      label: "Berücksichtigung der Leitpunkte",
      description:
        "How many of the task's Leitpunkte are treated with at least a short, relevant sentence? A point merely named does not count as treated.",
      zeroesWholeTask: true,
      bands: bands({
        A: "Alle vorgegebenen Leitpunkte werden angemessen bearbeitet.",
        B: "Alle bis auf einen Leitpunkt werden angemessen bearbeitet.",
        C: "Etwa die Hälfte der Leitpunkte wird angemessen bearbeitet.",
        D: "Nur einer oder keiner der Leitpunkte wird angemessen bearbeitet.",
      }),
    },
    {
      key: "kommunikativeGestaltung",
      label: "Kommunikative Gestaltung",
      description:
        "A logical order (greeting, reason for writing, the points, closing), simple connectors (und, aber, weil, deshalb), and a consistent register.",
      bands: bands({
        A: "Voll angemessen.",
        B: "Im Großen und Ganzen angemessen.",
        C: "Kaum noch akzeptabel.",
        D: "Insgesamt nicht ausreichend.",
      }),
    },
    {
      key: "formaleRichtigkeit",
      label: "Formale Richtigkeit",
      description:
        "Tense consistency (Perfekt/Präsens), word order in subordinate clauses, article and case agreement. Judge recurring patterns rather than every slip.",
      zeroesWholeTask: true,
      bands: bands({
        A: "Keine oder nur vereinzelte Fehler.",
        B: "Fehler, die das Verständnis nicht beeinträchtigen.",
        C: "Fehler an zentralen Stellen, die das Verständnis erheblich beeinträchtigen.",
        D: "So viele Fehler, dass der Text kaum noch verständlich ist.",
      }),
    },
  ],
  guidance:
    "This is an A2 writing task (short informal letter/message). Expect simple but connected sentences. Reward clear communication of every Leitpunkt even if grammar isn't perfect.",
};

const A1: LevelRubric = {
  ...A2,
  level: "A1",
  minWords: 25,
  maxWords: 40,
  timeLimitMinutes: 20,
  guidance:
    "This is an A1 (beginner) writing task. Be encouraging: judge whether the message is understandable and whether each Leitpunkt was touched on, not native-like fluency. A single simple sentence per point is sufficient. Flag grammar and spelling errors but explain them simply.",
};

export const telcRubrics: RubricLookup = { A1, A2, B1 };
