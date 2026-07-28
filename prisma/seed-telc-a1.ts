import type { SeedPrompt } from "./seed-types";

/**
 * TELC A1 "Schriftlicher Ausdruck" tasks, transcribed from the papers in
 * exam-materials/telc/a1/.
 *
 * A1 tasks differ structurally from the B1 Briefe: there is no incoming letter to
 * react to, so `stimulusText` is null and the candidate writes cold from the
 * Leitpunkte alone. They are also often addressed to an institution, which means the
 * formal "Sie" register rather than B1's informal "du". Every task is three Punkte,
 * which is what the A1 Kriterium I bands in src/lib/rubrics/telc.ts assume.
 *
 * Only telc-uebungstest-01.png prints an instruction line and a word count. Papers
 * 02-06 give a situation and three bullets and nothing else, so their `instructions`
 * are ours, not the paper's, and they inherit the 25-40 word band from the rubric.
 * Their titles, unlike the telc originals, are printed on the papers and kept verbatim.
 */
const base = {
  institute: "TELC",
  level: "A1",
  stimulusText: null,
  stimulusAuthor: null,
  instructions:
    "Schreiben Sie zu jedem Punkt ein bis zwei Sätze. Vergessen Sie nicht den passenden Anfang und Gruß am Schluss.",
  register: "SIE",
  requiresSubject: false,
  minWords: 25,
  maxWords: 40,
} as const;

export const telcA1Prompts: SeedPrompt[] = [
  {
    ...base,
    title: "Anfrage an die Touristeninformation",
    taskIntro: "Schreiben Sie an die Touristeninformation in Dresden:",
    // The only paper that prints its own instruction line, including a word count.
    instructions:
      "Schreiben Sie zu jedem Punkt ein bis zwei Sätze (circa 30 Wörter) auf den Antwortbogen. Vergessen Sie nicht den passenden Anfang und Gruß am Schluss.",
    leitpunkte: [
      "Sie kommen im August nach Dresden.",
      "Bitten Sie um Informationen über Film, Theater, Museen usw. (Kulturprogramm).",
      "Bitten Sie um Hoteladressen.",
    ],
    sourceFile: "telc-uebungstest-01.png",
  },
  {
    ...base,
    title: "Verspätete Lieferung",
    taskIntro: "Ihr Paket ist noch nicht angekommen. Schreiben Sie eine E-Mail an die Post.",
    leitpunkte: ["Welches Paket?", "Seit wann warten Sie?", "Bitte um Information"],
    sourceFile: "telc-uebungstest-02.png",
  },
  {
    ...base,
    title: "Malkurs",
    taskIntro: "Sie möchten einen Malkurs machen. Schreiben Sie eine E-Mail.",
    leitpunkte: ["Wann beginnt der Kurs?", "Wie viel kostet er?", "Wie kann man sich anmelden?"],
    sourceFile: "telc-uebungstest-03.png",
  },
  {
    ...base,
    title: "Verlängerung eines Abonnements",
    taskIntro: "Ihr Abonnement im Fitnessstudio endet bald. Schreiben Sie eine E-Mail.",
    leitpunkte: ["Welches Abonnement?", "Wie lange verlängern?", "Frage zum Preis?"],
    sourceFile: "telc-uebungstest-04.png",
  },
  {
    ...base,
    title: "Mitteilung an die Schule über eine neue Telefonnummer",
    taskIntro:
      "Sie haben eine neue Telefonnummer. Schreiben Sie eine E-Mail an die Schule.",
    leitpunkte: ["Ihre neue Telefonnummer", "Ab wann sie gültig ist", "Bitte um Bestätigung"],
    sourceFile: "telc-uebungstest-05.png",
  },
  {
    ...base,
    title: "Anfrage an ein Reisebüro über Urlaubsangebote",
    taskIntro: "Sie möchten Urlaub machen. Schreiben Sie eine E-Mail an ein Reisebüro.",
    leitpunkte: ["Wohin reisen?", "Wie lange?", "Preis?"],
    sourceFile: "telc-uebungstest-06.png",
  },
];
