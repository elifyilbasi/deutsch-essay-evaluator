import type { Band, BandLetter, LevelRubric, RubricLookup } from "./types";

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
 * telc Deutsch A2 (Start Deutsch 2), "Schreiben, Teil 2" — transcribed from the
 * official Übungstest 1, Informationen für Prüfende, "Bewertung". The grid is word
 * for word the same as telc A1's, and the marks go on the Antwortbogen S60 as
 * "1-2-3-K":
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
 * "Es können maximal 10 Punkte vergeben werden."
 *
 * What sets A2 apart from A1 is the task, not the grid: "Hier finden Sie vier
 * Punkte. Wählen Sie drei aus. Schreiben Sie zu jedem Punkt ein bis zwei Sätze
 * (circa 40 Wörter)." Four Leitpunkte are printed and three are marked — hence
 * `counted: 3` — so the point a candidate deliberately leaves out must cost nothing.
 * This belongs to the level rather than the task: the Antwortbogen S60 carries
 * exactly three Inhaltspunkt fields ("1-2-3-K") for every A2 paper.
 *
 * NOT transcribed, our inference: WHICH three count when a candidate answers all
 * four anyway. The paper says the candidate chooses three and is silent on that
 * case, so the scorer takes the best three, the reading most favourable to the
 * candidate. Revisit if telc ever states otherwise.
 *
 * Exam context, from the same paper's Testformat table: Schreiben Teil 1 (Formular)
 * 5 + Teil 2 10 = 15 for the Prüfungsteil Schreiben; Hören, Lesen, Schreiben and
 * Sprechen are 15 each, 60 in total. As at A1 there is no formale-Richtigkeit
 * criterion, no Zusatzpunkte and no "Thema verfehlt" override.
 */
const A2: LevelRubric = {
  level: "A2",
  minWords: 35,
  maxWords: 50,
  // The paper times "Lesen und Schreiben" together at 50 minutes and gives no
  // separate figure for writing; this is our split of it, not telc's.
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
    counted: 3,
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
    "This is telc Deutsch A2 (Start Deutsch 2), Schreiben Teil 2: a short message of one to two sentences per Inhaltspunkt, about 40 words. The task prints four Punkte and asks the candidate to choose three, so only three are marked — judge every Leitpunkt on its merits and never treat a deliberately unanswered fourth point as a failing. Almost the whole mark is content: each marked Inhaltspunkt is worth 3 of the 10 points. Award full marks for a point that is dealt with and understandable at A2; grammar and spelling are not in themselves a reason to withhold them. Only kommunikative Gestaltung is left over, and it is worth a single point.",
};

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

/**
 * telc Deutsch B2, Schriftlicher Ausdruck (Brief) — transcribed from "Modelltest TELC
 * Deutsch B2", Margarete Rodi, (c) Klett-Langenscheidt GmbH, München, 2013, pp. 38-39
 * "Bewertungskriterien - Schriftlicher Ausdruck (Brief)"; task and timing from pp. 20-22.
 * A local transcription with the verbatim wording sits in
 * exam-materials/telc/b2/BEWERTUNGSKRITERIEN.md.
 *
 * "Die Höchstpunktzahl für diesen Prüfungsteil beträgt 45 Punkte. Bei einer
 * Gesamtpunktzahl von 300 Punkten entspricht dies einer Gewichtung von 15 %." Three
 * criteria in A/B/C/D worth 5/3/1/0, "die Gesamtpunktzahl wird am Ende mit 3
 * multipliziert" — the same arithmetic as B1, which is where the resemblance stops.
 *
 * Provenance caveat: this is a publisher's Modelltest reproducing telc's grid, not a
 * telc-published Übungstest. telc gGmbH's own deck (Ellen Handke, "Bewertung des
 * Schriftlichen Ausdrucks: telc Deutsch B1 und telc Deutsch B2") names the same three
 * criteria and confirms A* — but calls Kriterium 1 "Behandlung/Berücksichtigung der
 * Leitpunkte" where the 2013 Modelltest prints "Behandlung des Schreibanlasses". Treat a
 * telc original as authoritative over this if one turns up.
 *
 * Four things that are B2's and must not be carried over from B1:
 *  - Kriterium 1 is holistic, not a count. B1 bands it purely by how many of four
 *    Leitpunkte are covered; B2 marks "die Wahl von Textsorte und Register" TOGETHER
 *    with "die Berücksichtigung von mindestens zwei Leitpunkten und gegebenenfalls
 *    weiterer inhaltlicher Aspekte", on a voll / im Großen und Ganzen / kaum noch /
 *    nicht ausreichend scale.
 *  - Two printed Leitpunkte plus an aspect of the candidate's own is full coverage.
 *  - A Leitpunkt needs more than one sentence ("Behandlung der LP erfordert mehr als ein
 *    Satzgefüge", telc's deck) — the direct opposite of B1, whose grid counts a Leitpunkt
 *    as erfüllt on a single short one.
 *  - There is NO "Thema verfehlt" override and no criterion that zeroes the task. B1
 *    states its override outright; a full-text search of the B2 paper finds neither, and
 *    the type's own rule is not to declare one without a citation.
 *
 * A* is worth the same 5 points as A and is offered on the first two criteria only:
 * "In den beiden ersten Kriterien kann auch die Bewertung A* vergeben werden."
 */
const B2_BAND_POINTS: Record<BandLetter, number> = { "A*": 5, A: 5, B: 3, C: 1, D: 0 };

/** The shared four-way scale both of B2's first two criteria are graded on. */
const b2AngemessenheitBands = (aboveLevel: string): Band[] => [
  { band: "A*", points: B2_BAND_POINTS["A*"], descriptor: aboveLevel },
  { band: "A", points: B2_BAND_POINTS.A, descriptor: "voll angemessen" },
  { band: "B", points: B2_BAND_POINTS.B, descriptor: "im Großen und Ganzen angemessen" },
  { band: "C", points: B2_BAND_POINTS.C, descriptor: "kaum noch akzeptabel" },
  { band: "D", points: B2_BAND_POINTS.D, descriptor: "insgesamt nicht ausreichend" },
];

const B2: LevelRubric = {
  level: "B2",
  minWords: 150,
  // "Schreiben Sie mindestens 150 Wörter." A floor with no ceiling printed anywhere.
  maxWords: null,
  // "Sie haben 30 Minuten Zeit, den Brief zu schreiben."
  timeLimitMinutes: 30,
  scoreMultiplier: 3,
  verified: true,
  themaVerfehltZeroesTask: false,
  scaleLabel: "Schriftlicher Ausdruck",
  scaleNote:
    "Der Schriftliche Ausdruck zählt 45 Punkte, das sind 15 % der Gesamtpunktzahl von 300. Bestehen wird bei telc über die gesamte schriftliche Prüfung gerechnet (60 %), nicht über diesen Teil allein.",
  selfChosenAspects: {
    minLeitpunkte: 2,
    expectedTotal: 3,
    guidance:
      "Die Aufgabe verlangt entweder mindestens drei der vorgegebenen Punkte oder mindestens zwei der vorgegebenen Punkte und einen weiteren Aspekt eigener Wahl. Ein selbst gewählter Aspekt zählt dabei so viel wie ein vorgegebener Leitpunkt.",
  },
  // B2 asks for a treated Leitpunkt to be developed, not merely mentioned: telc's own
  // examiner training states "Behandlung der LP erfordert mehr als ein Satzgefüge".
  // Stating it here matters because the generic fallback is B1-ish and far too lenient.
  leitpunktStatusGuidance: {
    ADDRESSED:
      "Der Leitpunkt ist ausgeführt, nicht nur genannt: die Behandlung erfordert mehr als ein Satzgefüge. Der Punkt ist inhaltlich entwickelt, dem Schreibanlass angemessen und im Register des Briefes behandelt.",
    PARTIAL:
      "Der Leitpunkt wird nur gestreift — in einem einzigen Satzgefüge abgehandelt, bloß erwähnt oder inhaltlich nicht entwickelt. Auf diesem Niveau genügt ein einzelner kurzer Satz nicht.",
    MISSING: "Der Leitpunkt wird gar nicht behandelt.",
  },
  criteria: [
    {
      key: "schreibanlass",
      label: "Kriterium 1: Behandlung des Schreibanlasses",
      description:
        "Judge two things together, as the grid does: (1) die Wahl von Textsorte und Register — this is a formal letter, so Absender, Anschrift, Datum, Betreffzeile, Anrede and Schlussformel belong to it and the Sie-register must hold throughout; and (2) die Berücksichtigung von mindestens zwei Leitpunkten und gegebenenfalls weiterer inhaltlicher Aspekte. Do NOT band this by counting printed Leitpunkte the way telc B1 does — the task explicitly allows two printed points plus a self-chosen aspect, and a candidate who took that option has covered the task in full. A point counts as treated only if it is developed beyond a single Satzgefüge.",
      bands: b2AngemessenheitBands(
        "Die Behandlung des Schreibanlasses liegt oberhalb des Zielniveaus B2.",
      ),
    },
    {
      key: "kommunikativeGestaltung",
      label: "Kriterium 2: Kommunikative Gestaltung",
      description:
        "Judge the four things the grid names: die Textorganisation, die Verknüpfung der Sätze/Äußerungseinheiten, die sprachliche Vielfalt und die Registertreue. At B2 expect a letter that is planned rather than a list — a fitting Einleitung, a sensible order of the points, and a Schluss — with connectives that bind the utterances into one text, vocabulary with genuine range, and a formal register that never wavers.",
      bands: b2AngemessenheitBands(
        "Die kommunikative Gestaltung liegt oberhalb des Zielniveaus B2.",
      ),
    },
    {
      key: "formaleRichtigkeit",
      label: "Kriterium 3: Formale Richtigkeit",
      description:
        "Bewertet werden Syntax, Morphologie und Orthographie. Weigh errors by whether they endanger die Verwirklichung der Schreibabsicht, and note that the bands turn on how many readings the text costs: B2 tolerates fewer comprehension-impeding errors than B1 does. There is no A* on this criterion.",
      // No A* here: the paper offers it "in den beiden ersten Kriterien" only.
      bands: (["A", "B", "C", "D"] as const).map((band) => ({
        band,
        points: B2_BAND_POINTS[band],
        descriptor: {
          A: "keine oder nur vereinzelte Fehler, die die Verwirklichung der Schreibabsicht aber nicht gefährden",
          B: "wenige Fehler, die bei einmaligem Lesen die Verwirklichung der Schreibabsicht nicht gefährden",
          C: "Fehler, die mehrmaliges Lesen erforderlich machen und so die Verwirklichung der Schreibabsicht deutlich gefährden",
          D: "so viele Fehler, dass die Schreibabsicht nicht verwirklicht wird",
        }[band],
      })),
    },
  ],
  guidance:
    "This is a telc Deutsch B2 Schriftlicher Ausdruck: a formal letter — a Beschwerde, an Anfrage or a Bewerbung — written in 30 minutes in response to a printed advertisement, of at least 150 words with no upper limit. Grade each criterion by choosing the band whose descriptor best fits, exactly as a telc examiner would, and do not invent intermediate grades. The three criteria are independent: a D on one leaves the others untouched, and at this level there is no Thema-verfehlt rule that zeroes the letter. Kriterium 1 is a single holistic judgement about Textsorte, Register and content coverage together — it is not a count of Leitpunkte. Award A* on Kriterium 1 or 2 only where the writing is genuinely above B2; it earns the same points as A and records that the candidate has outgrown the level.",
};

export const telcRubrics: RubricLookup = { A1, A2, B1, B2 };
