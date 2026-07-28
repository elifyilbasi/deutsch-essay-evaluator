import type { SeedPrompt } from "./seed-types";

/**
 * TELC A1 "Schriftlicher Ausdruck" tasks, transcribed from the papers in
 * exam-materials/telc/a1/.
 *
 * A1 tasks differ structurally from the B1 Briefe: there is no incoming letter to
 * react to, so `stimulusText` is null and the candidate writes cold from the
 * Leitpunkte alone. They are also often addressed to an institution, which means the
 * formal "Sie" register rather than B1's informal "du".
 */
export const telcA1Prompts: SeedPrompt[] = [
  {
    institute: "TELC",
    level: "A1",
    title: "Anfrage an die Touristeninformation",
    taskIntro: "Schreiben Sie an die Touristeninformation in Dresden:",
    stimulusText: null,
    stimulusAuthor: null,
    instructions:
      "Schreiben Sie zu jedem Punkt ein bis zwei Sätze (circa 30 Wörter) auf den Antwortbogen. Vergessen Sie nicht den passenden Anfang und Gruß am Schluss.",
    leitpunkte: [
      "Sie kommen im August nach Dresden.",
      "Bitten Sie um Informationen über Film, Theater, Museen usw. (Kulturprogramm).",
      "Bitten Sie um Hoteladressen.",
    ],
    register: "SIE",
    requiresSubject: false,
    minWords: 25,
    maxWords: 40,
    sourceFile: "telc-uebungstest-01.png",
  },
];
