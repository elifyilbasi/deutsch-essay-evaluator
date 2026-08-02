import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { telcRubrics } from "@/lib/rubrics/telc";
import { buildPrompt, resultFromVerdict } from "@/lib/gemini";
import { maxRawScore } from "@/lib/rubrics/types";
import type { LeitpunktStatus } from "@/lib/rubrics/types";
import { representativeTask, rubricsUnderTest } from "./fixtures";

/**
 * Structural checks on the generated prompt, rather than assertions about strings
 * someone remembered to look at. Three bugs in a row came from the same shape: the
 * rubric was corrected and a layer around it was not, so the model was told
 * something the scorer disagreed with. Any number the prompt states about marks
 * must be derivable from the rubric.
 */

describe("every mark the prompt states agrees with the rubric", () => {
  for (const [level, rubric] of rubricsUnderTest) {
    const task = representativeTask(rubric);

    it(`${level}: arithmetic is right and within the maximum`, () => {
      const prompt = buildPrompt(task);
      const max = maxRawScore(rubric, task.leitpunkte.length);

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
      const prompt = buildPrompt(task);
      const defined = new Set<number>([
        ...rubric.criteria.flatMap((c) => c.bands.map((b) => b.points)),
        ...Object.values(rubric.contentPointScoring?.points ?? {}),
      ]);
      for (const [whole, value] of prompt.matchAll(/\(([\d.]+) Punkte\)/g)) {
        assert.ok(defined.has(Number(value)), `"${whole}" is not a point value of ${level}`);
      }
    });

    it(`${level}: names only its own criteria`, () => {
      const prompt = buildPrompt(task);
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

describe("the prompt and the scorer agree on the maximum", () => {
  // The closing half of the loop. The checks above prove the prompt does not
  // contradict its rubric; these prove the SCORER does not contradict the prompt,
  // whatever the model sends back. That is the bug this file exists for: the scorer
  // used to derive the maximum from the verdict's coverage array, so a short reply
  // was quietly scored out of a smaller total than the prompt had announced.
  for (const [level, rubric] of rubricsUnderTest) {
    it(`${level}: the maximum is a property of the task, not of the verdict`, () => {
      const task = representativeTask(rubric);
      const stated = maxRawScore(rubric, task.leitpunkte.length) * rubric.scoreMultiplier;

      const shapes: LeitpunktStatus[][] = [
        task.leitpunkte.map(() => "ADDRESSED" as const),
        task.leitpunkte.slice(1).map(() => "ADDRESSED" as const), // examiner returned one fewer
        [], // examiner returned none at all
        [...task.leitpunkte, "extra"].map(() => "ADDRESSED" as const), // one too many
      ];

      for (const statuses of shapes) {
        const result = resultFromVerdict(
          {
            themaVerfehlt: false,
            leitpunktCoverage: statuses.map((status, i) => ({
              leitpunkt: `Punkt ${i + 1}`,
              status,
              comment: "",
            })),
            criteriaVerdicts: rubric.criteria.map((c) => ({
              key: c.key,
              band: c.bands[0].band,
              comment: "",
            })),
            corrections: [],
            summaryFeedback: "",
          },
          task,
        );
        assert.equal(
          result.maxScore,
          stated,
          `${level}: a verdict of ${statuses.length} statuses moved the maximum`,
        );
        // And the breakdown must still explain the total printed beside it.
        const sum = result.criteriaScores.reduce((t, c) => t + c.score, 0);
        assert.equal(sum, result.rawScore, `${level}: breakdown does not sum to rawScore`);
      }
    });
  }
});

describe("level-specific instructions", () => {
  it("tells A2, and only A2, that some points are not marked", () => {
    const a2 = buildPrompt(representativeTask(telcRubrics.A2!));
    assert.ok(a2.includes("only 3 are marked"));
    assert.ok(a2.includes("costs nothing"));
    assert.ok(a2.includes("3 × 3 = 9"));

    const a1 = buildPrompt(representativeTask(telcRubrics.A1!));
    assert.ok(!a1.includes("are marked, and the candidate chooses"));
    assert.ok(a1.includes("3 × 3 = 9"));
  });

  it("keeps the D-zeroes-the-task note out of every telc level", () => {
    for (const [level, rubric] of rubricsUnderTest) {
      const prompt = buildPrompt(representativeTask(rubric));
      assert.ok(
        !prompt.includes("scores the entire letter 0"),
        `${level} still threatens a task-wide zero for a single D`,
      );
    }
  });

  it("never asks A1 or A2 to grade formale Richtigkeit", () => {
    for (const rubric of [telcRubrics.A1!, telcRubrics.A2!]) {
      const prompt = buildPrompt(representativeTask(rubric));
      assert.ok(!/formale Richtigkeit/i.test(prompt));
    }
  });

  it("gives B1 telc's generous Leitpunkt threshold", () => {
    const b1 = buildPrompt(representativeTask(telcRubrics.B1!));
    assert.ok(b1.includes("Ein einziger, auch kurzer Satz genügt"));
  });
});
