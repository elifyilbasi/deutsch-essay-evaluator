import type { SeedPrompt } from "./seed-types";

/**
 * TELC A2 (Start Deutsch 2) "Schreiben, Teil 2" tasks, transcribed from the papers in
 * exam-materials/telc/a2/.
 *
 * Like A1 and unlike B1, none of these is a reply to an incoming letter, so
 * `stimulusText` is null and the candidate writes cold from the Situierung and the
 * Punkte. Several papers do say a message arrived ("Sie bekommen eine Nachricht von
 * Elena ... Antworten Sie") but none of them prints it, so there is nothing to quote.
 * `stimulusAuthor` stays null throughout for the same reason — the field names the
 * writer of a stimulus letter, and where the addressee matters the Situierung already
 * names them.
 *
 * Register is per task rather than per level here. Nine write to an institution, a
 * firm, a landlord or a colleague addressed by surname and take "Sie"; three (09, 10,
 * 12) write to a friend or a classmate from the Deutschkurs who is named by first
 * name, and take "du". The `base` below defaults to "SIE" and those three override it.
 *
 * Every task sets FOUR Leitpunkte, which is the point of the level: telc A2 prints
 * four and marks three (see the A2 rubric in src/lib/rubrics/telc.ts, whose
 * `contentPointScoring.counted` is 3). The rule lives on the level, not on the task,
 * because the Antwortbogen S60 carries exactly three Inhaltspunkt fields for every A2
 * paper — so the four points below are all offered, only the best three score, and the
 * one a candidate leaves out costs nothing.
 *
 * The twelve papers fall into two groups, and they are not equally authoritative:
 *
 *  - 01-04 and 08-12 print the full telc apparatus — "Schreiben Sie zu jedem Punkt
 *    1-2 Sätze (ca. 40 Wörter)", "Vergessen Sie nicht den passenden Anfang und Gruß am
 *    Schluss" and, underlined, "Hier finden Sie vier Punkte. Wählen Sie drei aus."
 *    Their `instructions` are the paper's, and so are their titles, kept verbatim,
 *    as are the Punkte — including where the paper prints them lower-case ("jemanden
 *    mitbringen", "das Baby") or as a bare name ("Lisa").
 *
 *  - 05-07 are bare task texts: a Situierung and four lettered points, with no
 *    instruction line, no word count and no "Wählen Sie drei aus". Their titles are
 *    ours (05's is from its lead line "Heizung Problem."), and their `instructions`
 *    keep whatever lead-in the paper prints and append the standard A2 sentence and
 *    word guidance, which is ours. The "Wählen Sie drei aus" sentence is deliberately
 *    NOT added to them: these papers do not print it. It changes no marks — the A2
 *    grid counts the best three Inhaltspunkte whatever the task page says — so a
 *    candidate who answers all four here simply has the weakest one ignored.
 *
 * Two transcription notes. 05 prints "Grund des Schreibens:" on its own line above
 * points a-c; it is read here as the first of four Punkte, not as a heading, because
 * 06 and 07 both print exactly that item as their point a). And 05's "der Vermieter
 * soll die die Heizung reparieren lassen" is silently repaired to one "die" — unlike
 * the B1 papers, whose printed typos are transcribed as-is, these three are plain-text
 * scraps whose doubled word is a wrapping artefact rather than something a candidate
 * would see on the page.
 *
 * `requiresSubject` is false throughout, including for the tasks written to a firm or
 * a landlord. The flag is decided by what the grid marks, and A2's only non-content
 * criterion, Kommunikative Gestaltung, is worth one point awarded for Anrede, Gruß and
 * textsortenspezifische Wendungen. No Betreff can earn or cost a mark at this level.
 */
// No `schreibanlass` here, unlike the other levels: A2 has no dominant Anlass to
// default to — four replies, three notices, two complaints and one each of the rest —
// so every task states its own and a base value would only hide that spread.
const base = {
  institute: "TELC",
  level: "A2",
  stimulusText: null,
  stimulusAuthor: null,
  register: "SIE",
  requiresSubject: false,
  minWords: 35,
  maxWords: 50,
} as const;

/** The instruction block printed identically on papers 01-04. */
const printedInstructions =
  "Hier finden Sie vier Punkte. Wählen Sie drei aus. Schreiben Sie zu jedem Punkt 1–2 Sätze (ca. 40 Wörter). Vergessen Sie nicht den passenden Anfang und Gruß am Schluss.";

/** Ours, for the papers that print no instruction line of their own. */
const wordGuidance =
  "Schreiben Sie zu jedem Punkt 1–2 Sätze (ca. 40 Wörter). Vergessen Sie nicht den passenden Anfang und Gruß am Schluss.";

export const telcA2Prompts: SeedPrompt[] = [
  {
    ...base,
    title: "Bewerbung für die Reinigungsstelle",
    schreibanlass: "BEWERBUNG",
    taskIntro:
      "Am Schwarzen Brett Ihrer Sprachschule haben Sie ein Angebot für eine Reinigungsstelle gefunden. Die Schule sucht eine Person, die zweimal pro Woche die Klassenräume sauber macht. Sie möchten sich für diese Arbeit bewerben, weil Sie Zeit haben und Erfahrung mit Reinigung haben. Schreiben Sie eine E-Mail an Herrn Berger.",
    instructions: printedInstructions,
    leitpunkte: [
      "Warum schreiben Sie?",
      "Wer sind Sie?",
      "Was können Sie?",
      "Wie kann man Sie erreichen?",
    ],
    sourceFile: "telc-uebungstest-01.png",
  },
  {
    ...base,
    title: "Entschuldigung und Frage zum Modelltest",
    schreibanlass: "ENTSCHULDIGUNG",
    taskIntro:
      "Sie besuchen einen Deutsch-Intensivkurs. Leider können Sie nächste Woche nicht in den Kurs kommen, weil Sie krank sind. Ihre Kursleiterin Frau Keller hat aber gesagt, dass es nächste Woche einen Modelltest für die Prüfung gibt. Sie möchten trotzdem lernen und fragen, wie das geht. Schreiben Sie eine E-Mail an Frau Keller.",
    instructions: printedInstructions,
    leitpunkte: [
      "Warum schreiben Sie?",
      "Entschuldigung für Ihr Fehlen",
      "Wie können Sie zu Hause lernen?",
      "Wann kommen Sie wieder in den Kurs?",
    ],
    sourceFile: "telc-uebungstest-02.png",
  },
  {
    ...base,
    title: "Geschirrspüler defekt – Bitte um schnelle Hilfe",
    schreibanlass: "BESCHWERDE",
    taskIntro:
      "Vor sechs Monaten haben Sie bei der Firma Müller Elektro einen Geschirrspüler gekauft. Leider funktioniert das Gerät seit letzter Woche nicht mehr. Sie haben schon oft bei der Firma angerufen, aber niemand geht ans Telefon. Deshalb schreiben Sie jetzt eine E-Mail, um das Problem zu klären. Schreiben Sie an die Firma Müller Elektro.",
    instructions: printedInstructions,
    leitpunkte: [
      "Warum schreiben Sie?",
      "Garantie",
      "Reparatur oder Austausch?",
      "Wie kann die Firma Sie erreichen?",
    ],
    sourceFile: "telc-uebungstest-03.png",
  },
  {
    ...base,
    title: "Vertretung im Büro am Montag und Dienstag",
    schreibanlass: "MITTEILUNG",
    taskIntro:
      "Sie nehmen am nächsten Montag und Dienstag an einem Erste-Hilfe-Kurs in der Volkshochschule teil. Deshalb können Sie an diesen Tagen nicht im Büro arbeiten. Ihre Kollegin Frau Becker soll Sie vertreten. Sie möchten ihr eine Nachricht schreiben, damit sie genau weiß, was sie tun muss. Schreiben Sie eine E-Mail an Frau Becker.",
    instructions: printedInstructions,
    leitpunkte: [
      "Warum schreiben Sie?",
      "Wie lange sind Sie nicht da?",
      "Was soll Frau Becker im Büro machen?",
      "Büroschlüssel: Wo ist der Schlüssel?",
    ],
    sourceFile: "telc-uebungstest-04.png",
  },
  {
    ...base,
    title: "Problem mit der Heizung",
    schreibanlass: "BESCHWERDE",
    taskIntro:
      "In Ihrer Wohnung haben Sie seit einiger Zeit Probleme mit der Heizung. Der Vermieter soll die Heizung reparieren lassen. Leider können Sie Ihren Vermieter telefonisch nicht erreichen, deshalb schreiben Sie einen Brief.",
    instructions: wordGuidance,
    leitpunkte: [
      "Grund des Schreibens",
      "Problem: wie lange schon?",
      "Termin für Reparatur",
      "Wie Sie erreichbar sind",
    ],
    sourceFile: "telc-uebungstest-05.png",
  },
  {
    ...base,
    title: "Wohnungsanzeige und Gartenarbeit",
    schreibanlass: "ANFRAGE",
    taskIntro:
      "Sie haben in der Zeitung eine private Wohnungsanzeige gefunden. Es handelt sich um eine 4-Zimmer-Wohnung. Die Miete für die Wohnung ist niedrig. Dafür sollen Sie aber der Hausbesitzerin, Frau Peters (83 Jahre), bei der Gartenarbeit helfen.",
    instructions: `Schreiben Sie über folgende Punkte an die Hausbesitzerin. ${wordGuidance}`,
    leitpunkte: [
      "Grund des Schreibens",
      "Zu Ihrer Person",
      "Fragen zur Wohnung",
      "Gartenarbeit",
    ],
    sourceFile: "telc-uebungstest-06.png",
  },
  {
    ...base,
    title: "Vertretung während des Computerkurses",
    schreibanlass: "MITTEILUNG",
    taskIntro:
      "Sie nehmen am kommenden Montag und Dienstag an einem Computerkurs teil, der in der Volkshochschule stattfindet. Deshalb können Sie nicht ins Büro gehen. Ihre Kollegin, Frau Sommer, soll Sie vertreten.",
    instructions: `Schreiben Sie etwas zu folgenden Punkten an Ihre Kollegin, Frau Sommer. ${wordGuidance}`,
    leitpunkte: [
      "Grund für Ihr Schreiben",
      "Dauer Ihrer Abwesenheit",
      "Aufgaben im Büro",
      "Büroschlüssel",
    ],
    sourceFile: "telc-uebungstest-07.png",
  },
  {
    ...base,
    title: "Neuer Termin für unsere Besprechung am Montag",
    schreibanlass: "MITTEILUNG",
    taskIntro:
      "Sie haben am Montag um 14 Uhr einen Besprechungstermin mit Ihrem Kunden Herrn Berger. Leider müssen Sie den Termin verschieben, weil etwas dazwischengekommen ist. Schreiben Sie eine kurze E-Mail an Herrn Berger.",
    instructions: printedInstructions,
    leitpunkte: [
      "Verschiebung des Termins (Grund)",
      "Neuer Termin",
      "Telefonisch erreichbar (wann?)",
      "Bitte um Rückmeldung",
    ],
    sourceFile: "telc-uebungstest-08.png",
  },
  {
    ...base,
    title: "Einladung zur Geburtstagsfeier",
    schreibanlass: "ANTWORT",
    taskIntro:
      "Sie bekommen eine Nachricht von Elena. Sie kennen Elena aus dem Deutschkurs. Sie schreibt, dass sie am 18. Mai eine Geburtstagsfeier macht. Elena lädt Sie ein und möchte wissen, ob Sie kommen. Antworten Sie.",
    instructions: printedInstructions,
    leitpunkte: ["jemanden mitbringen", "Ort und Anfahrt", "Uhrzeit der Feier", "Geschenk"],
    // A classmate on first-name terms. The "Sie" in the Situierung addresses the
    // candidate, as telc always does, and says nothing about the register of the reply.
    register: "DU",
    sourceFile: "telc-uebungstest-09.png",
  },
  {
    ...base,
    title: "Glückwunsch zur Reise und meine Fragen",
    schreibanlass: "ANTWORT",
    taskIntro:
      "Ihr Freund Rolf hat bei einem Gewinnspiel eine Reise nach Italien gewonnen. Er schreibt Ihnen, dass er Sie mitnehmen möchte. Sie freuen sich sehr darüber. Antworten Sie.",
    instructions: printedInstructions,
    leitpunkte: ["Reiseziel", "Reisetermin", "Gratulation", "Verkehrsmittel"],
    register: "DU",
    sourceFile: "telc-uebungstest-10.png",
  },
  {
    ...base,
    title: "Besuch und Glückwünsche zur Geburt",
    schreibanlass: "ANTWORT",
    taskIntro:
      "Sie bekommen eine Nachricht von Frau Weber. Sie kennen sie aus der Arbeit. Sie schreibt, dass sie am 15. August ein Baby bekommen hat. Frau Weber freut sich über Besuch. Sie lädt Sie und Ihre Kollegin Sabine ein. Antworten Sie.",
    instructions: printedInstructions,
    leitpunkte: ["Besuch mit Sabine", "das Baby", "Geschenk", "Termin für den Besuch"],
    sourceFile: "telc-uebungstest-11.png",
  },
  {
    ...base,
    title: "Einladung zur Hochzeit",
    schreibanlass: "ANTWORT",
    taskIntro:
      "Sie bekommen eine Nachricht von Jonas. Sie kennen Jonas aus dem Deutschkurs. Er schreibt, dass er am 5. Dezember in Hamburg Lisa heiratet. Jonas lädt Sie ein und fragt, ob Sie kommen. Antworten Sie.",
    instructions: printedInstructions,
    leitpunkte: ["jemanden mitbringen", "Lisa", "Geschenk", "Übernachtung in Hamburg"],
    register: "DU",
    sourceFile: "telc-uebungstest-12.png",
  },
];
