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
 * telc Deutsch B2, Schriftlicher Ausdruck — transcribed from telc's own published paper:
 * "telc Deutsch B2, ÜBUNGSTEST 1, Überarbeitete Auflage 2019", (c) telc gGmbH,
 * Frankfurt a. M., 2021, pp. 42-43 "Bewertungskriterien Schriftlicher Ausdruck" and p. 44
 * "Berechnung des Teilergebnisses"; the task itself pp. 20-22. The verbatim wording is in
 * exam-materials/telc/b2/BEWERTUNGSKRITERIEN.md beside a copy of the PDF.
 *
 * "Die Punktzahl im Subtest Schriftlicher Ausdruck ist die Summe der Punkte, die für die
 * drei Kriterien vergeben wurden. In der telc Zentrale wird diese Punktzahl mit drei
 * multipliziert, d. h., eine Teilnehmerin bzw. ein Teilnehmer kann in diesem Subtest
 * maximal 45 Punkte erreichen. Dies entspricht 15 % der maximal erreichbaren
 * Gesamtpunktzahl von 300 Punkten." All three criteria are A/B/C/D worth 5/3/1/0.
 *
 * This replaces an earlier reading taken from a Klett-Langenscheidt Modelltest (2013),
 * which is a publisher's reproduction of a superseded format. It was wrong in ways that
 * moved marks, and the differences are worth naming so they are not reintroduced:
 *
 *  - Kriterium I is "Aufgabenbewältigung" and it COUNTS treated points. The old reading
 *    called it "Behandlung des Schreibanlasses" and told the examiner not to count.
 *  - There is no A*. The criteria table's header reads "A B C D*", where the asterisk is
 *    a footnote marker for the Thema-verfehlt rule, not a band. The 2013 edition did
 *    offer A*, which is where it came from.
 *  - Thema verfehlt DOES zero the task: "muss bei allen Kriterien D vergeben werden".
 *    The old reading declared no such rule because the 2013 paper states none.
 *  - Situierung verfehlt is a separate, narrower rule that zeroes only Kriterium I.
 *  - The Textsorte is a (halb-)formelle E-MAIL, not a Brief, so Absender, Empfänger and
 *    Datum are explicitly "nicht gefordert" — see Kriterium II.
 *
 * Unchanged across both editions, and so safe to rely on: 45 points, 15 % of 300, three
 * criteria at 5/3/1/0 summed and multiplied by three, 30 minutes, minimum 150 words, and
 * "eine angemessene Behandlung ... erfordert mehr als nur ein einziges Satzgefüge".
 */
const B2_BAND_POINTS = { A: 5, B: 3, C: 1, D: 0 } as const;

/**
 * The CEFR scale telc applies to both language criteria, its four steps named by the
 * level a performance sits at rather than by how "angemessen" it is.
 */
const b2SprachlicheBands = (descriptors: Record<"A" | "B" | "C" | "D", string>): Band[] =>
  (["A", "B", "C", "D"] as const).map((band) => ({
    band,
    points: B2_BAND_POINTS[band],
    descriptor: descriptors[band],
  }));

const B2: LevelRubric = {
  level: "B2",
  minWords: 150,
  // "Schreiben Sie mindestens 150 Wörter." A floor with no ceiling printed anywhere.
  maxWords: null,
  // "30 Minuten Schriftlicher Ausdruck", and the candidate first picks one of two topics.
  timeLimitMinutes: 30,
  scoreMultiplier: 3,
  verified: true,
  // "Hat der Text mit dem Schreibanlass keine oder kaum eine Verbindung, muss bei allen
  // Kriterien D vergeben werden. Auf dem Antwortbogen S30 wird dann bei Thema verfehlt
  // das Feld ja markiert."
  themaVerfehltZeroesTask: true,
  scaleLabel: "Schriftlicher Ausdruck",
  scaleNote:
    "Der Schriftliche Ausdruck zählt 45 Punkte, das sind 15 % der Gesamtpunktzahl von 300. Bestehen wird bei telc über die gesamte Prüfung gerechnet, nicht über diesen Teil allein.",
  selfChosenAspects: {
    minLeitpunkte: 2,
    expectedTotal: 3,
    guidance:
      "Für die Bestnote werden drei Leitpunkte bzw. zwei Leitpunkte und ein weiterer, auf die Situierung bezogener Aspekt eigener Wahl inhaltlich angemessen bearbeitet. Ein selbst gewählter Aspekt zählt dabei so viel wie ein vorgegebener Leitpunkt, muss sich aber auf die Situierung beziehen.",
  },
  // telc's own threshold, and far stricter than B1's, where a single short sentence is
  // enough: "Eine angemessene Behandlung eines Leitpunktes bzw. eines frei gewählten
  // Aspekts erfordert mehr als nur ein einziges Satzgefüge."
  leitpunktStatusGuidance: {
    ADDRESSED:
      "Der Leitpunkt (oder der frei gewählte Aspekt) ist inhaltlich angemessen auf dem Niveau B2 bearbeitet: mehr als ein einziges Satzgefüge, inhaltlich entwickelt, adressatenbezogen und auf die Situierung bezogen.",
    PARTIAL:
      "Der Punkt wird nur gestreift — in einem einzigen Satzgefüge abgehandelt, bloß erwähnt oder inhaltlich nicht entwickelt. Das zählt nicht als bearbeitet und darf nicht in die Zählung für Kriterium I eingehen.",
    MISSING: "Der Punkt wird gar nicht behandelt.",
  },
  criteria: [
    {
      key: "aufgabenbewaeltigung",
      label: "Kriterium I: Aufgabenbewältigung",
      description:
        "Count how many points are treated inhaltlich angemessen auf dem Niveau B2, and pick the band that matches the count — a printed Leitpunkt and a self-chosen aspect count alike, but a self-chosen aspect must relate to the Situierung. A point counts only if it is developed beyond a single Satzgefüge; merely mentioning it does not. Judge the realisation of the task for a semi-formal or formal e-mail (Beschwerde, Bitte um Information and so on): the candidate's own position should be presented differentiert und adressatenbezogen, and any reduction of content or linguistic complexity is a reason to mark down. Two failures are distinct and must not be confused. If the text has no or barely any connection to the Schreibanlass, that is Thema verfehlt and D follows in EVERY criterion — report it via the themaVerfehlt flag. If the text takes up the topic but does not fit the Situierung (telc's example: asked to request information about a placement, the candidate sends an application instead), only THIS criterion is D — the language criteria are still marked normally, and themaVerfehlt must NOT be set.",
      bands: (["A", "B", "C", "D"] as const).map((band) => ({
        band,
        points: B2_BAND_POINTS[band],
        descriptor: {
          A: "Die Schreibleistung deckt die Aufgabenstellung voll ab. Drei Leitpunkte bzw. zwei Leitpunkte und ein weiterer auf die Situierung bezogener Aspekt werden inhaltlich angemessen auf dem angezielten Niveau bearbeitet.",
          B: "Die Schreibleistung deckt die Aufgabenstellung weitgehend ab. Zwei Leitpunkte bzw. ein Leitpunkt und ein weiterer auf die Situierung bezogener Aspekt werden inhaltlich angemessen auf dem angezielten Niveau bearbeitet.",
          C: "Die Schreibleistung deckt die Aufgabenstellung nur teilweise ab. Ein Leitpunkt bzw. ein weiterer auf die Situierung bezogener Aspekt wird inhaltlich angemessen auf dem angezielten Niveau bearbeitet.",
          D: "Die Schreibleistung deckt die Aufgabenstellung nicht ab. Kein Leitpunkt bzw. kein weiterer auf die Situierung bezogener Aspekt wird inhaltlich angemessen auf dem angezielten Niveau bearbeitet.",
        }[band],
      })),
    },
    {
      key: "kommunikativeGestaltung",
      label: "Kriterium II: Kommunikative Gestaltung",
      description:
        "Judge the range of expression together with structure and text logic — Kohäsion and Kohärenz: Textlogik, Konnektoren, Register and Wortschatzspektrum, and the discourse-steering elements that bind the utterances into one semantic whole. THE TEXTSORTE IS A SEMI-FORMAL OR FORMAL E-MAIL, so the letter's features — Absender, Empfänger, Datum — are explicitly nicht gefordert and their absence must never cost marks, whatever the task sheet's own advice says. Withhold A only when the Textsortenmerkmale of a semi-formal or formal message (Betreffzeile, Anrede, Schlussformel) are missing AND the Wortschatzspektrum is not fully adequate — both together, never one alone. Withhold B if the wrong register is chosen or the register wavers, if the Wortschatzspektrum is not adequate for B2, or if the Leitpunkte are listed linearly without logical connection. Give C where Textlogik, connectives, vocabulary range and register are predominantly unsuitable and would make a negative impression on the recipient, and D where they are wholly unsuitable.",
      bands: b2SprachlicheBands({
        A: "B2 gut erfüllt — die Schreibleistung liegt im oberen Bereich des Zielniveaus. Kann sich in formellem und weniger formellem Stil überzeugend und klar ausdrücken; breites Spektrum sprachlicher Mittel; verwendet verschiedene Verknüpfungsmittel sinnvoll.",
        B: "B2 erfüllt — die Schreibleistung liegt auf dem Zielniveau. Kann sich klar ausdrücken; hinreichend breites Spektrum sprachlicher Mittel, jedoch mit Lücken im Wortschatz; begrenzte Anzahl von Verknüpfungsmitteln.",
        C: "B1 — die Schreibleistung liegt auf der Stufe unterhalb des Zielniveaus. Äußert sich über vertraute Themen; verbindet Einzelelemente zu einer linearen, zusammenhängenden Äußerung.",
        D: "A2 oder darunter — die Schreibleistung liegt zwei Stufen oder mehr unter dem Zielniveau. Nur elementare Sprachfunktionen und die häufigsten Konnektoren.",
      }),
    },
    {
      key: "formaleRichtigkeit",
      label: "Kriterium III: Formale Richtigkeit",
      description:
        "Judge grammar, orthography and punctuation. All Schreibkonventionen of standard varieties of German are accepted, including the rules of Groß- und Kleinschreibung. Weigh systematic errors far more heavily than slips: occasional Ausrutscher and traces of the first language are compatible with the top band, systematic errors are not. This criterion is independent of the others — telc states outright that a D here leaves Kriterien I and II free to be A, B or C — so never let weak grammar pull down the content or organisation bands.",
      bands: b2SprachlicheBands({
        A: "B2 gut erfüllt — gute Beherrschung der Grammatik, keine systematischen Fehler, gelegentliche Ausrutscher möglich; Rechtschreibung und Zeichensetzung weitgehend korrekt.",
        B: "B2 erfüllt — recht gute Beherrschung der Grammatik, nur wenige systematische Fehler, die das Verständnis nicht gefährden; Rechtschreibung und Zeichensetzung hinreichend korrekt.",
        C: "B1 — ausreichende Beherrschung trotz deutlicher Einflüsse der Erstsprache; mehrere systematische Fehler, aber überwiegend bleibt klar, was ausgedrückt werden soll.",
        D: "A2 oder darunter — viele systematische, elementare Fehler, z. B. vermischte Zeitformen oder fehlende Subjekt-Verb-Kongruenz; die Rechtschreibung ist häufig phonetisch.",
      }),
    },
  ],
  guidance:
    "This is a telc Deutsch B2 Schriftlicher Ausdruck: a semi-formal or formal e-mail — a Beschwerde, a Bitte um Information, a Bewerbung — written in 30 minutes in response to a printed advertisement or notice, of at least 150 words with no upper limit. Grade each criterion by choosing the band whose descriptor best fits, exactly as a telc examiner would, and do not invent intermediate grades. Kriterium I is decided by COUNTING how many points are treated adequately — three, or two plus a self-chosen aspect related to the Situierung, earns A — so settle the per-point judgements first, remembering that a point needs more than a single Satzgefüge to count. Kriterien II and III are graded against the CEFR scale, where A means the writing sits in the upper part of B2 and C means it has dropped to B1. The criteria are otherwise independent: a D on Formale Richtigkeit leaves the other two untouched. Only a text with no or barely any connection to the Schreibanlass is Thema verfehlt and graded D throughout; a text on the right topic but the wrong Situierung loses only Kriterium I.",
};

export const telcRubrics: RubricLookup = { A1, A2, B1, B2 };
