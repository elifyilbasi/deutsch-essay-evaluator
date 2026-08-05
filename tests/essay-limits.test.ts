import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_ESSAY_CHARS,
  WORD_TOLERANCE,
  checkEssayLength,
  exceedsBodyLimit,
  MAX_BODY_BYTES,
} from "@/lib/essayLimits";
import { countWords, formatWordRange, wordsOutOfRange } from "@/lib/wordCount";
import { telcRubrics } from "@/lib/rubrics/telc";

/**
 * Caps on what can reach a paid model call. The app runs on a shared free-tier key,
 * so an unbounded submission is an availability problem for every user, not just a
 * cost one.
 */

const B1 = telcRubrics.B1!;
const A1 = telcRubrics.A1!;

describe("character cap", () => {
  it("rejects a huge string with no whitespace, which counts as one word", () => {
    const blob = "a".repeat(MAX_ESSAY_CHARS + 1);
    // This is the whole reason the character cap exists: countWords splits on
    // whitespace, so a word-based check alone would wave this straight through.
    assert.equal(countWords(blob), 1);
    assert.ok(checkEssayLength(blob, B1, countWords(blob)));
  });

  it("accepts a string exactly at the limit and rejects one character more", () => {
    const atLimit = "a ".repeat(MAX_ESSAY_CHARS / 2).slice(0, MAX_ESSAY_CHARS);
    assert.equal(atLimit.length, MAX_ESSAY_CHARS);
    assert.equal(checkEssayLength(atLimit, B1, 1), null);
    assert.ok(checkEssayLength(atLimit + "a", B1, 1));
  });
});

describe("word tolerance", () => {
  const essay = (words: number) => Array.from({ length: words }, () => "Wort").join(" ");

  /**
   * A level's word ceiling, insisting it has one. Levels may set a floor and no ceiling
   * (telc B2), so this fails loudly rather than quietly reading null as zero if a level
   * used below ever loses its maximum.
   */
  const cap = (rubric: { level: string; maxWords: number | null }) => {
    if (rubric.maxWords === null) {
      throw new Error(`${rubric.level} has no maxWords; this test needs a level that does`);
    }
    return rubric.maxWords;
  };

  it("accepts a normal B1 essay of about 100 words", () => {
    const text = essay(100);
    assert.equal(checkEssayLength(text, B1, countWords(text)), null);
  });

  it("accepts overshoot, which telc does not penalise", () => {
    const text = essay(cap(B1) + 20);
    assert.equal(checkEssayLength(text, B1, countWords(text)), null);
  });

  it("rejects beyond the tolerance", () => {
    const over = cap(B1) * WORD_TOLERANCE + 1;
    const text = essay(over);
    assert.ok(checkEssayLength(text, B1, countWords(text)));
  });

  it("scales the tolerance with the level", () => {
    // A1 expects far shorter texts, so its ceiling is correspondingly lower.
    const text = essay(cap(A1) * WORD_TOLERANCE + 1);
    assert.ok(checkEssayLength(text, A1, countWords(text)));
    assert.equal(checkEssayLength(text, B1, countWords(text)), null);
  });
});

describe("body size gate", () => {
  it("rejects an oversized Content-Length", () => {
    assert.equal(exceedsBodyLimit(String(MAX_BODY_BYTES + 1)), true);
    assert.equal(exceedsBodyLimit(String(MAX_BODY_BYTES)), false);
  });

  it("allows a missing or unparseable header through to the real check", () => {
    assert.equal(exceedsBodyLimit(null), false);
    assert.equal(exceedsBodyLimit("not-a-number"), false);
  });
});

describe("word range display", () => {
  it("prints a floor without a ceiling as a minimum, not a range", () => {
    // "150-null" is what a raw interpolation produced, and inventing a ceiling to avoid
    // it would colour a legitimate long B2 letter as an error.
    assert.equal(formatWordRange(150, null), "mindestens 150");
    assert.equal(formatWordRange(80, 100), "80-100");
  });

  it("still calls a text short when the level sets no ceiling", () => {
    // The floor is the half of the requirement B2 does state.
    assert.equal(wordsOutOfRange(149, 150, null), true);
    assert.equal(wordsOutOfRange(150, 150, null), false);
  });

  it("never calls a text long when the level sets no ceiling", () => {
    assert.equal(wordsOutOfRange(400, 150, null), false);
    // ... but does where the level prints one.
    assert.equal(wordsOutOfRange(101, 80, 100), true);
  });
});
