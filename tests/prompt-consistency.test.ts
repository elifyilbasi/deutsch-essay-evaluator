import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { telcRubrics } from "@/lib/rubrics/telc";
import { buildPrompt } from "@/lib/gemini";
import { maxRawScore } from "@/lib/rubrics/types";
import type { LevelRubric } from "@/lib/rubrics/types";

/**
 * Structural checks on the generated prompt, rather than assertions about strings
 * someone remembered to look at. Three bugs in a row came from the same shape: the
 * rubric was corrected and a layer around it was not, so the model was told
 * something the scorer disagreed with. Any number the prompt states about marks
 * must be derivable from the rubric.
 */

const task = (rubric: LevelRubric, leitpunkte: string[]) =>
  ({
    institute: "TELC",
    level: rubric.level,
    promptTitle: "Beispielaufgabe",
    taskIntro: "Sie haben folgende Nachricht erhalten:",
    stimulusText: null,
    stimulusAuthor: null,
    instructions: "Antworten Sie.",
    leitpunkte,
    register: "DU" as const,
    requiresSubject: false,
    rubric,
    essay: "Beispieltext.",
    wordCount: rubric.minWords,
  }) as never;

const cases: { level: string; rubric: LevelRubric; leitpunkte: string[] }[] = [
  { level: "A1", rubric: telcRubrics.A1!, leitpunkte: ["a", "b", "c"] },
  { level: "A2", rubric: telcRubrics.A2!, leitpunkte: ["a", "b", "c", "d"] },
  { level: "B1", rubric: telcRubrics.B1!, leitpunkte: ["a", "b", "c", "d"] },
];

describe("every mark the prompt states agrees with the rubric", () => {
  for (const { level, rubric, leitpunkte } of cases) {
    it(`${level}: arithmetic is right and within the maximum`, () => {
      const prompt = buildPrompt(task(rubric, leitpunkte));
      const max = maxRawScore(rubric, leitpunkte.length);

      const sums = [...prompt.matchAll(/(\d+) × ([\d.]+) = ([\d.]+)/g)];
      for (const [whole, a, b, total] of sums) {
        assert.equal(Number(a) * Number(b), Number(total), `"${whole}" does not add up`);
        assert.ok(
          Number(total) <= max,
          `"${whole}" claims more marks than the rubric's maximum of ${max}`,
        );
      }
    });

    it(`${level}: every point value quoted is one the rubric defines`, () => {
      const prompt = buildPrompt(task(rubric, leitpunkte));
      const defined = new Set<number>([
        ...rubric.criteria.flatMap((c) => c.bands.map((b) => b.points)),
        ...Object.values(rubric.contentPointScoring?.points ?? {}),
      ]);
      for (const [whole, value] of prompt.matchAll(/\(([\d.]+) Punkte\)/g)) {
        assert.ok(defined.has(Number(value)), `"${whole}" is not a point value of ${level}`);
      }
    });

    it(`${level}: names only its own criteria`, () => {
      const prompt = buildPrompt(task(rubric, leitpunkte));
      for (const c of rubric.criteria) assert.ok(prompt.includes(`key="${c.key}"`));
      const foreign = ["leitpunkte", "kommunikativeGestaltung", "formaleRichtigkeit"].filter(
        (k) => !rubric.criteria.some((c) => c.key === k),
      );
      for (const key of foreign) {
        assert.ok(!prompt.includes(`key="${key}"`), `${level} offers a foreign criterion ${key}`);
      }
    });
  }
});

describe("level-specific instructions", () => {
  it("tells A2, and only A2, that some points are not marked", () => {
    const a2 = buildPrompt(task(telcRubrics.A2!, ["a", "b", "c", "d"]));
    assert.ok(a2.includes("only 3 are marked"));
    assert.ok(a2.includes("costs nothing"));
    assert.ok(a2.includes("3 × 3 = 9"));

    const a1 = buildPrompt(task(telcRubrics.A1!, ["a", "b", "c"]));
    assert.ok(!a1.includes("are marked, and the candidate chooses"));
    assert.ok(a1.includes("3 × 3 = 9"));
  });

  it("keeps the D-zeroes-the-task note out of every telc level", () => {
    for (const { level, rubric, leitpunkte } of cases) {
      const prompt = buildPrompt(task(rubric, leitpunkte));
      assert.ok(
        !prompt.includes("scores the entire letter 0"),
        `${level} still threatens a task-wide zero for a single D`,
      );
    }
  });

  it("never asks A1 or A2 to grade formale Richtigkeit", () => {
    for (const rubric of [telcRubrics.A1!, telcRubrics.A2!]) {
      const prompt = buildPrompt(task(rubric, ["a", "b", "c"]));
      assert.ok(!/formale Richtigkeit/i.test(prompt));
    }
  });

  it("gives B1 telc's generous Leitpunkt threshold", () => {
    const b1 = buildPrompt(task(telcRubrics.B1!, ["a", "b", "c", "d"]));
    assert.ok(b1.includes("Ein einziger, auch kurzer Satz genügt"));
  });
});
