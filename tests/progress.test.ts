import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { asPercent, progressByLevel } from "@/lib/progress";
import type { AttemptInput } from "@/lib/progress";
import type { Level } from "@/generated/prisma/client";

/**
 * The trap this guards is mixing scales. telc B1 is out of 45 and A1/A2 out of 10, and
 * each evaluation stores its own maximum so old rows survive rubric changes — so any
 * aggregate has to be a ratio, and levels can never be pooled.
 */

const at = (day: number) => new Date(2026, 0, day);

const attempt = (
  level: Level,
  day: number,
  score: number | null,
  maxScore = 45,
  zeroedReason: string | null = null,
): AttemptInput => ({
  level,
  createdAt: at(day),
  evaluation: score === null ? null : { overallScore: score, maxScore, zeroedReason },
});

describe("progressByLevel", () => {
  it("keeps levels apart rather than pooling incompatible scales", () => {
    // 9/10 at A1 is a better performance than 27/45 at B1, and a pooled average of
    // the raw scores would say the opposite.
    const result = progressByLevel([attempt("A1", 1, 9, 10), attempt("B1", 2, 27, 45)]);
    assert.deepEqual(
      result.map((r) => r.level),
      ["A1", "B1"],
    );
    assert.equal(asPercent(result[0].averageRatio), 90);
    assert.equal(asPercent(result[1].averageRatio), 60);
  });

  it("compares attempts by ratio, not by raw score", () => {
    // Same level, different maxima — a rubric change between attempts.
    const result = progressByLevel([attempt("A1", 1, 9, 10), attempt("A1", 2, 12, 15)]);
    assert.equal(result[0].best.score, 9, "9/10 beats 12/15 despite the smaller number");
    assert.equal(asPercent(result[0].best.ratio), 90);
  });

  it("orders attempts oldest first, whatever order they arrive in", () => {
    const result = progressByLevel([
      attempt("B1", 3, 30),
      attempt("B1", 1, 10),
      attempt("B1", 2, 20),
    ]);
    assert.deepEqual(
      result[0].attempts.map((a) => a.score),
      [10, 20, 30],
    );
    assert.equal(result[0].latest.score, 30);
    assert.equal(result[0].best.score, 30);
  });

  it("counts zeroed attempts separately but still in the average", () => {
    // A "Thema verfehlt" zero is a real result, so it belongs in the average — but a
    // learner staring at a low number deserves to know one essay caused it.
    const result = progressByLevel([
      attempt("B1", 1, 45),
      attempt("B1", 2, 0, 45, "Thema verfehlt"),
    ]);
    assert.equal(result[0].zeroedCount, 1);
    assert.equal(asPercent(result[0].averageRatio), 50);
  });

  it("counts unevaluated attempts in the total but not in the scores", () => {
    const result = progressByLevel([attempt("B1", 1, 45), attempt("B1", 2, null)]);
    assert.equal(result[0].totalAttempts, 2);
    assert.equal(result[0].attempts.length, 1);
    assert.equal(asPercent(result[0].averageRatio), 100);
  });

  it("omits a level with nothing scored yet", () => {
    assert.deepEqual(progressByLevel([attempt("A2", 1, null)]), []);
    assert.deepEqual(progressByLevel([]), []);
  });

  it("does not divide by zero on a nonsensical maximum", () => {
    const result = progressByLevel([attempt("B1", 1, 0, 0)]);
    assert.equal(result[0].averageRatio, 0);
    assert.ok(Number.isFinite(result[0].best.ratio));
  });
});

describe("asPercent", () => {
  it("rounds to whole percent", () => {
    assert.equal(asPercent(0.855), 86);
    assert.equal(asPercent(0), 0);
    assert.equal(asPercent(1), 100);
  });
});
