/**
 * Shape of a seeded writing task, shared by the per-level seed files.
 *
 * `stimulusText` is nullable because not every task is reactive: B1 Briefe reply to
 * an incoming letter, while lower-level tasks are often written cold to an institution
 * (e.g. an enquiry to a tourist office), with only the Leitpunkte to work from.
 */
/**
 * Re-exported from the generated client rather than spelled out again here.
 *
 * It was a hand-written union, which meant the members existed in two places that
 * nothing checked against each other: adding one to schema.prisma and forgetting this
 * list would have failed at the seed, not at the type. Taking it from the generator makes
 * schema.prisma the only place the set is written. prisma/seed.ts already imports from
 * the generated client, so this adds no dependency the seed did not already have.
 */
export type { Schreibanlass } from "../src/generated/prisma/enums";
import type { Schreibanlass } from "../src/generated/prisma/enums";

export type SeedPrompt = {
  institute: "TELC" | "GOETHE";
  level: "A1" | "A2" | "B1" | "B2";
  title: string;
  taskIntro: string;
  stimulusText: string | null;
  stimulusAuthor: string | null;
  instructions: string;
  leitpunkte: string[];
  register: "DU" | "SIE";
  /**
   * Why the candidate is writing. Classified from the task's own Situierung and
   * instructions, never from its title: several titles here name the topic rather than
   * the Anlass, and following them would be wrong. B1's "Beschwerde über einen
   * Sprachkurs" is a reply to a school asking for feedback (ANTWORT); A2's "Einladung
   * zur Geburtstagsfeier" is a reply to an invitation, not one being sent (ANTWORT);
   * B2's "Protest gegen den Abriss eines Spielplatzes" says "Schreiben Sie einen
   * Beschwerdebrief" in as many words (BESCHWERDE).
   */
  schreibanlass: Schreibanlass;
  requiresSubject: boolean;
  minWords: number;
  /** Null where the level prints a floor and no ceiling — telc B2 asks only for 150+. */
  maxWords: number | null;
  /** Which file in exam-materials/ this was transcribed from. Not a DB column. */
  sourceFile?: string;
};
