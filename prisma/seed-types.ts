/**
 * Shape of a seeded writing task, shared by the per-level seed files.
 *
 * `stimulusText` is nullable because not every task is reactive: B1 Briefe reply to
 * an incoming letter, while lower-level tasks are often written cold to an institution
 * (e.g. an enquiry to a tourist office), with only the Leitpunkte to work from.
 */
export type SeedPrompt = {
  institute: "TELC" | "GOETHE";
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  title: string;
  taskIntro: string;
  stimulusText: string | null;
  stimulusAuthor: string | null;
  instructions: string;
  leitpunkte: string[];
  register: "DU" | "SIE";
  requiresSubject: boolean;
  minWords: number;
  maxWords: number;
  /** Which file in exam-materials/ this was transcribed from. Not a DB column. */
  sourceFile?: string;
};
