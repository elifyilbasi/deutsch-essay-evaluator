import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { telcRubrics } from "@/lib/rubrics";
import { formatWordRange } from "@/lib/wordCount";
import { telcA1Prompts } from "../prisma/seed-telc-a1";
import { telcA2Prompts } from "../prisma/seed-telc-a2";
import { telcB1Prompts } from "../prisma/seed-telc-b1";
import { telcB2Prompts } from "../prisma/seed-telc-b2";
import type { SeedPrompt } from "../prisma/seed-types";

/**
 * The task bank, checked against the rubric that will score it.
 *
 * Two A2 tasks once sat in the database on 30-50 words while the A2 rubric said
 * 35-50, so the length the candidate was shown and the length the model was told to
 * expect disagreed. The seed is insert-only no longer (see prisma/seed.ts), so a
 * correction here now reaches the database — which is precisely why these files need
 * checking: they have become the single source of truth for the bank.
 *
 * Scope: the transcribed per-level files, which is where new tasks are added. The
 * handful of hand-written entries inline in prisma/seed.ts are not covered, because
 * that module builds a PrismaClient and runs the seed on import. Moving them into a
 * sibling file would close the gap.
 */

const banks: Array<[string, SeedPrompt[]]> = [
  ["A1", telcA1Prompts],
  ["A2", telcA2Prompts],
  ["B1", telcB1Prompts],
  ["B2", telcB2Prompts],
];

describe("every seeded task agrees with its level's rubric", () => {
  for (const [name, bank] of banks) {
    it(`${name}: word bounds are the rubric's, not the task's own`, () => {
      for (const task of bank) {
        const rubric = telcRubrics[task.level];
        assert.ok(rubric, `${task.level} "${task.title}" has no rubric`);
        // Formatted rather than interpolated raw: a level may set a floor and no
        // ceiling, and "150-null" is not a sentence anyone wants in a failure message.
        const stated = formatWordRange(task.minWords, task.maxWords);
        const required = formatWordRange(rubric.minWords, rubric.maxWords);
        assert.equal(
          stated,
          required,
          `${task.level} "${task.title}" states ${stated} where the ${task.level} rubric states ${required}`,
        );
      }
    });

    it(`${name}: never offers fewer Leitpunkte than the level marks`, () => {
      for (const task of bank) {
        // A2 prints four and marks the best three; where a level marks a fixed
        // number, a task offering fewer puts full marks out of reach.
        const counted = telcRubrics[task.level]?.contentPointScoring?.counted;
        if (counted === undefined) continue;
        assert.ok(
          task.leitpunkte.length >= counted,
          `${task.level} "${task.title}" offers ${task.leitpunkte.length} Leitpunkte ` +
            `but ${task.level} marks ${counted}`,
        );
      }
    });

    it(`${name}: every task is at the level its file is named for`, () => {
      for (const task of bank) {
        assert.equal(task.level, name, `"${task.title}" is ${task.level} in the ${name} bank`);
      }
    });
  }
});

describe("the bank's identity key holds", () => {
  // The seed matches a stored row on (institute, level, title). Two entries sharing
  // that triple are one task to the seed: the second silently overwrites the first.
  it("gives no two tasks the same institute, level and title", () => {
    const seen = new Map<string, string>();
    for (const [name, bank] of banks) {
      for (const task of bank) {
        const key = `${task.institute}|${task.level}|${task.title}`;
        const previous = seen.get(key);
        assert.equal(previous, undefined, `${key} appears in both ${previous} and ${name}`);
        seen.set(key, name);
      }
    }
  });

  it("gives every task a non-empty title and at least one Leitpunkt", () => {
    for (const [, bank] of banks) {
      for (const task of bank) {
        assert.ok(task.title.trim().length > 0, "a task has an empty title");
        assert.ok(task.leitpunkte.length > 0, `"${task.title}" has no Leitpunkte`);
      }
    }
  });
});
