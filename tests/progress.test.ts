import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  asPercent,
  isPass,
  levelSlots,
  PASS_RATIO,
  plotWindow,
  progressByLevel,
  ratioOf,
} from "@/lib/progress";
import type { AttemptInput } from "@/lib/progress";
import { LEVELS } from "@/lib/writeParams";
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
  id: `${level}-${day}`,
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

  it("measures the delta between attempts by ratio, not by raw score", () => {
    // The same trap as `best`, one field along: the raw number went up, the performance
    // went down, and only a ratio delta says so.
    const result = progressByLevel([attempt("A1", 1, 9, 10), attempt("A1", 2, 12, 15)]);
    assert.equal(result[0].deltaBaseline?.score, 9);
    assert.ok(result[0].deltaRatio !== null && result[0].deltaRatio < 0);
    assert.equal(asPercent(result[0].deltaRatio!), -10);
  });

  it("reports no delta on a first attempt rather than a zero one", () => {
    // Zero would read as "no change since last time", and there is no last time.
    const result = progressByLevel([attempt("B1", 1, 30)]);
    assert.equal(result[0].deltaBaseline, null);
    assert.equal(result[0].deltaRatio, null);
  });

  it("measures the delta past a zeroed attempt, not against it", () => {
    // 45/45, then an off-topic zero, then 39/45. Against the zero this reads "+87", a
    // triumph the learner did not have; against the last real score it is the -13 that
    // actually happened.
    const result = progressByLevel([
      attempt("B1", 1, 45),
      attempt("B1", 2, 0, 45, "Thema verfehlt"),
      attempt("B1", 3, 39),
    ]);
    assert.equal(result[0].deltaBaseline?.score, 45);
    assert.equal(asPercent(result[0].deltaRatio!), -13);
  });

  it("reports no delta when the latest attempt is itself zeroed", () => {
    // "-100 since last" would describe the rule that fired, not the writing.
    const result = progressByLevel([
      attempt("B1", 1, 45),
      attempt("B1", 2, 0, 45, "Thema verfehlt"),
    ]);
    assert.equal(result[0].deltaBaseline, null);
    assert.equal(result[0].deltaRatio, null);
  });

  it("reports no delta when every earlier attempt was zeroed", () => {
    const result = progressByLevel([
      attempt("B1", 1, 0, 45, "Thema verfehlt"),
      attempt("B1", 2, 39),
    ]);
    assert.equal(result[0].deltaBaseline, null);
    assert.equal(result[0].deltaRatio, null);
  });

  it("counts the pass mark itself as a pass", () => {
    const result = progressByLevel([
      attempt("B1", 1, 27), // exactly 60%
      attempt("B1", 2, 26), // just under
    ]);
    assert.equal(result[0].passedCount, 1);
  });

  it("threads the essay id through in oldest-first order", () => {
    // The chart links each mark back to its essay, so the id has to survive the sort.
    const result = progressByLevel([attempt("B1", 3, 30), attempt("B1", 1, 10)]);
    assert.deepEqual(
      result[0].attempts.map((a) => a.id),
      ["B1-1", "B1-3"],
    );
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
    // The reason travels with the attempt so a caller can name the rule that fired
    // instead of assuming "Thema verfehlt" — a single D-graded criterion zeroes too.
    assert.equal(result[0].latest.zeroed, true);
    assert.equal(result[0].latest.zeroedReason, "Thema verfehlt");
    assert.equal(result[0].passedCount, 1, "a zero is not a pass");
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

describe("plotWindow", () => {
  const attempts = (n: number) =>
    progressByLevel(
      Array.from({ length: n }, (_, i) => attempt("B1", i + 1, 30)),
    )[0].attempts;

  it("keeps the most recent attempts, still oldest first", () => {
    const windowed = plotWindow(attempts(5), 3);
    assert.deepEqual(
      windowed.map((a) => a.id),
      ["B1-3", "B1-4", "B1-5"],
    );
  });

  it("does not pad or truncate a history shorter than the window", () => {
    assert.equal(plotWindow(attempts(2), 12).length, 2);
    assert.deepEqual(plotWindow([], 12), []);
    assert.deepEqual(plotWindow(attempts(3), 0), []);
  });

  it("leaves the aggregates it windows alone", () => {
    // The whole reason this is not a slice inside progressByLevel: narrowing the plot
    // must never change what `best` or `totalAttempts` mean.
    const result = progressByLevel([
      attempt("B1", 1, 45), // the best, and outside a 2-wide window
      attempt("B1", 2, 20),
      attempt("B1", 3, 25),
    ]);
    assert.equal(plotWindow(result[0].attempts, 2).length, 2);
    assert.equal(asPercent(result[0].best.ratio), 100);
    assert.equal(result[0].totalAttempts, 3);
  });
});

describe("levelSlots", () => {
  it("gives every offered level a slot, attempted or not, in ladder order", () => {
    // The grid needs the empty rungs: they are what shows a learner where to go next.
    const slots = levelSlots(progressByLevel([attempt("B1", 1, 30)]));
    assert.deepEqual(
      slots.map((s) => s.level),
      LEVELS.filter((l) => l.enabled).map((l) => l.value),
    );
    assert.equal(slots.find((s) => s.level === "B1")?.progress?.latest.score, 30);
    assert.equal(slots.find((s) => s.level === "A1")?.progress, null);
  });

  it("offers no slot for a level the wizard does not enable", () => {
    // Guards the grid against drifting from what a learner can actually write.
    const enabled = new Set(LEVELS.filter((l) => l.enabled).map((l) => l.value));
    const disabled = LEVELS.filter((l) => !l.enabled).map((l) => l.value);
    const slots = levelSlots([]);
    for (const level of disabled) {
      assert.equal(
        slots.some((s) => s.level === level),
        false,
        `${level} is not enabled and should not get a slot`,
      );
    }
    assert.deepEqual(new Set(slots.map((s) => s.level)), enabled);
  });

  it("leaves progressByLevel free to omit empty levels", () => {
    // The padding lives here precisely so the aggregate keeps its documented contract.
    assert.deepEqual(progressByLevel([]), []);
    assert.equal(levelSlots([]).length, LEVELS.filter((l) => l.enabled).length);
  });
});

describe("isPass", () => {
  it("treats the threshold itself as a pass", () => {
    assert.equal(PASS_RATIO, 0.6);
    assert.equal(isPass(0.6), true);
    assert.equal(isPass(0.59), false);
  });

  it("does not pass a nonsensical maximum", () => {
    assert.equal(isPass(ratioOf(0, 0)), false);
  });
});

describe("asPercent", () => {
  it("rounds to whole percent", () => {
    assert.equal(asPercent(0.855), 86);
    assert.equal(asPercent(0), 0);
    assert.equal(asPercent(1), 100);
  });
});
