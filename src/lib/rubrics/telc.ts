import type { Band, LevelRubric, RubricLookup } from "./types";

/**
 * telc writing rubrics, expressed as data so new levels/institutes only require
 * new entries here (or in a sibling file), never changes to the evaluation pipeline.
 *
 * The B1 grid is transcribed from telc Deutsch B1 / Zertifikat Deutsch, Übungstest 1,
 * überarbeitete Auflage 2019: "Bewertungskriterien Schriftlicher Ausdruck" and
 * "Berechnung des Teilergebnisses des Schriftlichen Ausdrucks". Three criteria in
 * A/B/C/D bands worth 5/3/1/0, summed and multiplied by three — "eine Teilnehmerin
 * bzw. ein Teilnehmer kann in diesem Subtest maximal 45 Punkte erreichen", which is
 * 15 % of the exam's 300.
 *
 * Three rules that earlier editions of this file got wrong, all stated outright in
 * that paper. They are B1's rules and must not be generalised to other levels:
 *  - Only "Thema verfehlt" forces D everywhere: "bezieht sich der Text nicht oder
 *    kaum auf die Aufgabenstellung, gilt Thema verfehlt und damit D in allen
 *    Kriterien". A D on a single criterion never zeroes the rest.
 *  - "Wird Kriterium III mit D bewertet, können die Kriterien I und II mit C, B oder
 *    A bewertet sein."
 *  - The subtest score is "die Summe der Punkte, die für die drei Kriterien vergeben
 *    wurden" — there are no Zusatzpunkte in this edition.
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
  verified: true,
  themaVerfehltZeroesTask: true,
  scaleLabel: "Schriftlicher Ausdruck",
  scaleNote:
    "Der Schriftliche Ausdruck zählt 45 Punkte, das sind 15 % der Gesamtpunktzahl von 300. Bestehen wird bei telc über die gesamte schriftliche Prüfung gerechnet (60 %), nicht über diesen Teil allein.",
  // telc's threshold for "bearbeitet" is deliberately low, and the evaluator's
  // generic wording ("adequate detail", "too thin") is stricter than the grid.
  // Left generic, a one-sentence treatment lands in PARTIAL and stops counting.
  leitpunktStatusGuidance: {
    ADDRESSED:
      "Der Leitpunkt ist inhaltlich angemessen bearbeitet: sinnvoll behandelt, verständlich und auf die Aufgabe bezogen. Ein einziger, auch kurzer Satz genügt. Zwei Leitpunkte dürfen zusammen in einem Satz behandelt werden, und bei mehrteiligen oder pluralisch formulierten Leitpunkten genügt eine Antwort.",
    PARTIAL:
      "Der Leitpunkt wird erwähnt, aber nicht sinnvoll behandelt oder ist nicht verständlich. Diese Einstufung sollte selten sein, weil die Schwelle für 'bearbeitet' niedrig liegt — im Zweifel ist der Leitpunkt bearbeitet.",
    MISSING: "Der Leitpunkt wird gar nicht behandelt.",
  },
  criteria: [
    {
      key: "leitpunkte",
      label: "Kriterium I: Aufgabenbewältigung",
      description:
        "Count how many Leitpunkte are inhaltlich angemessen bearbeitet, applying telc's own threshold, which is generous: a Leitpunkt counts as erfüllt if it is dealt with sensibly, is still understandable and relates to the task — even if it is only a single, possibly short, sentence, even if it is handled together with a second Leitpunkt in one sentence, and, where a Leitpunkt has two components or is phrased in the plural, even if only one answer is given. If the text takes up the task's topic but does not fit the Situierung, grade this criterion D — that alone does not affect Kriterium II or III.",
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
        "Judge the range of expression together with structure and text logic — cohesion and coherence: connectors, register, breadth of vocabulary, and the linking elements that bind the utterances into one text. The Textsorte is a personal or semi-formal message, so the formal letter's features (Absender, Empfänger, Datum, Betreffzeile) are NOT required and their absence must not cost marks. Withhold A if the Textsortenmerkmale of such a message are missing, if the wrong register is chosen or the register wavers, if the Leitpunkte stand unconnected side by side, or if the sentences predominantly begin with Ich or Wir. Give C or D for grave breaches of Adressatenbezug and register that leave the text unclear or self-contradictory at central points — even when Anrede and Grußformel are correct — and for entirely missing or nonsensical links.",
      bands: bands({
        A: "B1 gut erfüllt — die Schreibleistung liegt im oberen Bereich des Zielniveaus.",
        B: "B1 erfüllt — die Schreibleistung liegt auf dem Zielniveau.",
        C: "A2 — die Schreibleistung liegt auf der Stufe unterhalb des Zielniveaus.",
        D: "A1 oder darunter — die Schreibleistung liegt zwei Stufen oder mehr unter dem Zielniveau.",
      }),
    },
    {
      key: "formaleRichtigkeit",
      label: "Kriterium III: Formale Richtigkeit",
      description:
        "Judge syntax, morphology and orthography under the Primat der Verständlichkeit: errors weigh according to how much they impede a reader taking in the content in one pass. Endungsfehler and Genusfehler therefore count for less than Kongruenzfehler and the like. As long as the errors do not block swift comprehension, A or B remains available depending on the length of the text and the number and kind of errors.",
      bands: bands({
        A: "B1 gut erfüllt — die Schreibleistung liegt im oberen Bereich des Zielniveaus.",
        B: "B1 erfüllt — die Schreibleistung liegt auf dem Zielniveau.",
        C: "A2 — die Schreibleistung liegt auf der Stufe unterhalb des Zielniveaus.",
        D: "A1 oder darunter — die Schreibleistung liegt zwei Stufen oder mehr unter dem Zielniveau.",
      }),
    },
  ],
  guidance:
    "This is a telc B1 Schriftlicher Ausdruck: a reply to the message quoted above, written in 30 minutes. Grade each criterion by choosing the band whose descriptor best fits, exactly as a telc examiner would — do not invent intermediate grades. Kriterium I is decided purely by how many Leitpunkte are adequately treated, so settle the per-Leitpunkt judgements first. The three criteria are graded independently of one another: a D on any single criterion leaves the other two untouched, and only a text that has no or barely any connection to the Aufgabenstellung (Thema verfehlt) is graded D throughout. Reacting to the sender's own news is part of good kommunikative Gestaltung, but never substitutes for covering the Leitpunkte.",
};

/**
 * The A2 grid below is NOT transcribed from official telc material — telc Start
 * Deutsch 2 uses a different writing format and scale. It reuses the B1 band shape
 * as a stand-in so the level remains usable, with a multiplier of 1 so the score is
 * reported out of 15 rather than implying the B1 45-point scale. Every German
 * descriptor in it is ours. Replace it once a real grid is available, as was done
 * for A1 (see exam-materials/README.md).
 */
const A2: LevelRubric = {
  level: "A2",
  minWords: 30,
  maxWords: 50,
  // Not taken from an official paper - adjust alongside the A2 scoring grid.
  timeLimitMinutes: 20,
  scoreMultiplier: 1,
  verified: false,
  themaVerfehltZeroesTask: true,
  scaleLabel: "Schreiben",
  // Deliberately claims nothing about the real exam: this grid is a stand-in.
  scaleNote: "Dieser Punktwert bezieht sich nur auf diese Schreibaufgabe.",
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

/**
 * telc Deutsch A1 (Start Deutsch 1), "Schreiben, Teil 2" — transcribed from the
 * official Übungstest 1, Informationen für Prüfende, "Bewertung" (the criteria the
 * two Prüfende enter on the green Antwortbogen S60 as the marks "1-2-3-KG"):
 *
 *   Erfüllung der Aufgabenstellung (pro Inhaltspunkt)
 *     3    Aufgabe voll erfüllt und verständlich
 *     1,5  Aufgabe wegen sprachlicher und inhaltlicher Mängel nur teilweise erfüllt
 *     0    Aufgabe nicht erfüllt und/oder unverständlich
 *   Kommunikative Gestaltung des Texts
 *     1    der Textsorte angemessen
 *     0,5  untypische oder fehlende Wendungen, z. B. keine Anrede
 *     0    keine textsortenspezifischen Wendungen
 *
 * "Es können maximal 10 Punkte vergeben werden" — three Inhaltspunkte at 3 plus 1
 * for kommunikative Gestaltung.
 *
 * Where those 10 points sit in the exam, from the same paper's Testformat table —
 * worth keeping here, because a bare "10 / 10" invites the assumption that it is a
 * subtest or exam total:
 *
 *   Schreiben, Teil 1 (Formular ausfüllen)   5   (5 items x 1 point)
 *   Schreiben, Teil 2 (this rubric)         10
 *   → Prüfungsteil Schreiben                15
 *   Hören 15 · Lesen 15 · Schreiben 15 · Sprechen 15 = 60 gesamt
 *   "Die Punktzahl wird mit 1,66 multipliziert": 60 → ~100, and the Prädikate are
 *   90-100 sehr gut, 80-89 gut, 70-79 befriedigend, 60-69 ausreichend,
 *   0-59 teilgenommen. So 60 of the scaled 100 is the pass mark.
 *
 * Note what the grid does NOT contain: no formale
 * Richtigkeit criterion, no banding by how many points were covered, no Zusatzpunkte
 * and no "Thema verfehlt" override. Grammar and spelling matter only where they make
 * an Inhaltspunkt "nur teilweise erfüllt" or "unverständlich", so they are fed back
 * as corrections but never scored on their own. Schreiben Teil 1 (Formular ausfüllen)
 * is a separate, deliberately out-of-scope part of the exam.
 */
const A1: LevelRubric = {
  level: "A1",
  minWords: 25,
  maxWords: 40,
  // Not printed on the task pages we hold; adjust if a paper states otherwise.
  timeLimitMinutes: 20,
  scoreMultiplier: 1,
  verified: true,
  themaVerfehltZeroesTask: false,
  scaleLabel: "Schreiben, Teil 2",
  scaleNote:
    "Schreiben, Teil 2 zählt 10 Punkte. Mit Teil 1 (Formular ausfüllen, 5 Punkte) ergibt das den Prüfungsteil Schreiben mit 15 Punkten. Hören, Lesen, Schreiben und Sprechen zählen je 15 Punkte, zusammen 60. Diese Punktzahl wird mit 1,66 multipliziert; ab 60 Punkten gilt die Prüfung als bestanden (ausreichend).",
  contentPointScoring: {
    label: "Erfüllung der Aufgabenstellung",
    description:
      "Each Inhaltspunkt is marked on its own. Full marks require the point to be dealt with comprehensibly; half marks are for a point whose treatment falls short through weak language or thin content; no marks where the point is untreated or cannot be understood.",
    points: { ADDRESSED: 3, PARTIAL: 1.5, MISSING: 0 },
    descriptors: {
      ADDRESSED: "Aufgabe voll erfüllt und verständlich",
      PARTIAL: "Aufgabe wegen sprachlicher und inhaltlicher Mängel nur teilweise erfüllt",
      MISSING: "Aufgabe nicht erfüllt und/oder unverständlich",
    },
  },
  criteria: [
    {
      key: "kommunikativeGestaltung",
      label: "Kommunikative Gestaltung des Texts",
      description:
        "One mark for the text as a whole, judged only on whether it carries the phrases its Textsorte calls for — an Anrede, a Gruß am Schluss, and an opening that suits a message to this addressee. Do not judge grammar, spelling, or the ordering of the content here.",
      bands: [
        { band: "A", points: 1, descriptor: "der Textsorte angemessen" },
        {
          band: "B",
          points: 0.5,
          descriptor: "untypische oder fehlende Wendungen, z. B. keine Anrede",
        },
        { band: "C", points: 0, descriptor: "keine textsortenspezifischen Wendungen" },
      ],
    },
  ],
  guidance:
    "This is telc Deutsch A1 (Start Deutsch 1), Schreiben Teil 2: a short message of one to two sentences per Inhaltspunkt, usually to an institution. Almost the whole mark is content — each Inhaltspunkt is worth 3 of the 10 points and is marked on its own, so settle those judgements first and weigh nothing else into them. Award full marks for a point that is dealt with and understandable at A1; a beginner's grammar and spelling are not in themselves a reason to withhold them. Only kommunikative Gestaltung is left over, and it is worth a single point.",
};

export const telcRubrics: RubricLookup = { A1, A2, B1 };
