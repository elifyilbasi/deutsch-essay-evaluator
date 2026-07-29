import { telcRubrics } from "@/lib/rubrics/telc";
import type { TaskContext } from "@/lib/gemini";
import type { LevelRubric } from "@/lib/rubrics/types";

/**
 * One representative task per level, shared by the structural and snapshot tests so
 * both cover every level the project defines rather than a list someone maintains
 * by hand. `rubricsUnderTest` iterates the real lookup: a new level shows up in every
 * test automatically, and fails loudly here until it has a fixture.
 */

/** Leitpunkte counts differ by level — telc A2 prints four and marks three. */
const LEITPUNKTE: Record<string, string[]> = {
  A1: ["Ihr Anliegen", "Eine Frage", "Eine Bitte"],
  A2: ["Reaktion auf die Einladung", "Ein Vorschlag", "Eine Frage", "Ein Termin"],
  B1: ["Ihre Neuigkeiten", "Ein Vorschlag", "Eine Frage", "Ein Treffen"],
};

/** Stimulus text only where the level's task is a reply to an incoming message. */
const STIMULUS: Record<string, { text: string; author: string } | null> = {
  A1: null,
  A2: null,
  B1: {
    author: "Jana",
    text: "Liebe(r) ...,\n\nlange nichts gehört! Bei mir hat sich einiges getan.\n\nLiebe Grüße\nJana",
  },
};

export const rubricsUnderTest = Object.entries(telcRubrics) as [string, LevelRubric][];

export function leitpunkteFor(level: string): string[] | undefined {
  return LEITPUNKTE[level];
}

export function representativeTask(rubric: LevelRubric): TaskContext {
  const leitpunkte = LEITPUNKTE[rubric.level];
  if (!leitpunkte) {
    throw new Error(
      `No fixture for level ${rubric.level}. Add one to tests/fixtures.ts so the ` +
        `structural and snapshot tests cover it.`,
    );
  }
  const stimulus = STIMULUS[rubric.level] ?? null;
  return {
    institute: "TELC",
    level: rubric.level,
    promptTitle: "Beispielaufgabe",
    taskIntro: "Sie haben folgende Nachricht erhalten:",
    stimulusText: stimulus?.text ?? null,
    stimulusAuthor: stimulus?.author ?? null,
    instructions: "Antworten Sie auf die Nachricht.",
    leitpunkte,
    register: rubric.level === "A1" ? "SIE" : "DU",
    requiresSubject: false,
    rubric,
    essay: "Beispieltext der Teilnehmerin.",
    wordCount: rubric.minWords,
  };
}
