import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resultFromVerdict } from "@/lib/gemini";
import type { ExaminerVerdict, LeitpunktCoverage } from "@/lib/gemini";
import { telcRubrics } from "@/lib/rubrics/telc";
import type { LeitpunktStatus, LevelRubric } from "@/lib/rubrics/types";

/**
 * What the evaluator does with what the model sends back. The response schema
 * constrains this, but a model can still omit a field, invent a criterion key, or
 * return more coverage entries than the task has Leitpunkte — and a mark sheet must
 * never come out self-contradictory. The one bug that reached a real run lived here:
 * the breakdown summed all four A2 points against a total that counted three.
 */

const A1 = telcRubrics.A1!;
const A2 = telcRubrics.A2!;
const B1 = telcRubrics.B1!;

const cover = (statuses: LeitpunktStatus[]): LeitpunktCoverage[] =>
  statuses.map((status, i) => ({ leitpunkt: `Punkt ${i + 1}`, status, comment: "" }));

const verdict = (v: Partial<ExaminerVerdict> = {}): ExaminerVerdict => ({
  themaVerfehlt: false,
  leitpunktCoverage: [],
  criteriaVerdicts: [],
  corrections: [],
  summaryFeedback: "",
  ...v,
});

const run = (rubric: LevelRubric, v: Partial<ExaminerVerdict>) =>
  resultFromVerdict(verdict(v), { rubric, level: rubric.level });

/** The breakdown must always explain the total it is printed beside. */
const assertSelfConsistent = (result: ReturnType<typeof run>) => {
  const sum = result.criteriaScores.reduce((t, c) => t + c.score, 0);
  assert.equal(
    sum,
    result.rawScore,
    `breakdown sums to ${sum} but rawScore is ${result.rawScore}`,
  );
  for (const c of result.criteriaScores) {
    assert.ok(c.score <= c.maxScore, `${c.key}: ${c.score} exceeds its max ${c.maxScore}`);
    assert.ok(c.maxScore > 0, `${c.key} has a zero maximum, which renders as NaN`);
  }
  const maxSum = result.criteriaScores.reduce((t, c) => t + c.maxScore, 0);
  assert.ok(maxSum * 3 >= result.maxScore, "breakdown maxima cannot reach the stated maximum");
};

describe("a well-formed verdict", () => {
  it("B1: derives 39/45 from A/A/B", () => {
    const r = run(B1, {
      leitpunktCoverage: cover(["ADDRESSED", "ADDRESSED", "ADDRESSED", "ADDRESSED"]),
      criteriaVerdicts: [
        { key: "leitpunkte", band: "A", comment: "" },
        { key: "kommunikativeGestaltung", band: "A", comment: "" },
        { key: "formaleRichtigkeit", band: "B", comment: "" },
      ],
    });
    assert.equal(r.overallScore, 39);
    assert.equal(r.rawScore, 13);
    assertSelfConsistent(r);
  });

  it("A2: counts the best three of four and stays self-consistent", () => {
    const r = run(A2, {
      leitpunktCoverage: cover(["ADDRESSED", "ADDRESSED", "MISSING", "ADDRESSED"]),
      criteriaVerdicts: [{ key: "kommunikativeGestaltung", band: "A", comment: "" }],
    });
    assert.equal(r.overallScore, 10);
    const content = r.criteriaScores[0];
    assert.equal(content.maxScore, 9, "the skipped point must not raise the maximum");
    assert.match(content.label, /3 Inhaltspunkte/);
    assertSelfConsistent(r);
  });
});

describe("a model that returns something unexpected", () => {
  it("ignores a criterion key the rubric does not define", () => {
    const r = run(A1, {
      leitpunktCoverage: cover(["ADDRESSED", "ADDRESSED", "ADDRESSED"]),
      criteriaVerdicts: [
        { key: "kommunikativeGestaltung", band: "A", comment: "ok" },
        { key: "formaleRichtigkeit", band: "A", comment: "invented" },
      ],
    });
    assert.equal(r.overallScore, 10, "an invented criterion must not add marks");
    assert.ok(!r.criteriaScores.some((c) => c.key === "formaleRichtigkeit"));
    assertSelfConsistent(r);
  });

  it("does not crash when a criterion verdict is missing entirely", () => {
    const r = run(B1, {
      leitpunktCoverage: cover(["ADDRESSED", "ADDRESSED", "ADDRESSED", "ADDRESSED"]),
      criteriaVerdicts: [{ key: "leitpunkte", band: "A", comment: "" }],
    });
    // Documented behaviour, not necessarily the desired one: an absent verdict
    // falls back to the rubric's last band, which is the 0-point one.
    assert.equal(r.overallScore, 15);
    assert.equal(r.criteriaScores.find((c) => c.key === "formaleRichtigkeit")?.score, 0);
    assertSelfConsistent(r);
  });

  it("does not crash on a band letter outside the rubric", () => {
    const r = run(A1, {
      leitpunktCoverage: cover(["ADDRESSED", "ADDRESSED", "ADDRESSED"]),
      // A1's only criterion is a three-way split; "D" is not one of its bands.
      criteriaVerdicts: [{ key: "kommunikativeGestaltung", band: "D", comment: "" }],
    });
    assert.equal(r.criteriaScores.find((c) => c.key === "kommunikativeGestaltung")?.score, 0);
    assertSelfConsistent(r);
  });

  it("handles an empty coverage list without producing NaN", () => {
    const r = run(A1, {
      leitpunktCoverage: [],
      criteriaVerdicts: [{ key: "kommunikativeGestaltung", band: "A", comment: "" }],
    });
    assert.ok(Number.isFinite(r.overallScore));
    assert.ok(Number.isFinite(r.maxScore));
    // Nothing was judged, so no content row is shown at all: a row with a maximum
    // of 0 divides by zero in the progress bar.
    assert.ok(!r.criteriaScores.some((c) => c.key === "inhaltspunkte"));
    assertSelfConsistent(r);
  });

  it("handles more coverage entries than the task has Leitpunkte", () => {
    const r = run(A2, {
      leitpunktCoverage: cover([
        "ADDRESSED",
        "ADDRESSED",
        "ADDRESSED",
        "ADDRESSED",
        "ADDRESSED",
      ]),
      criteriaVerdicts: [{ key: "kommunikativeGestaltung", band: "A", comment: "" }],
    });
    assert.equal(r.overallScore, 10, "A2 marks three however many come back");
    assertSelfConsistent(r);
  });

  it("survives entirely absent arrays", () => {
    const r = resultFromVerdict({ themaVerfehlt: false } as ExaminerVerdict, {
      rubric: A1,
      level: "A1",
    });
    assert.ok(Number.isFinite(r.overallScore));
    assert.deepEqual(r.corrections, []);
    assert.deepEqual(r.leitpunktCoverage, []);
    assert.equal(r.summaryFeedback, "");
  });
});

describe("Thema verfehlt", () => {
  it("zeroes every line of the B1 breakdown, not just the total", () => {
    const r = run(B1, {
      themaVerfehlt: true,
      leitpunktCoverage: cover(["ADDRESSED", "ADDRESSED", "ADDRESSED", "ADDRESSED"]),
      criteriaVerdicts: [
        { key: "leitpunkte", band: "A", comment: "" },
        { key: "kommunikativeGestaltung", band: "A", comment: "" },
        { key: "formaleRichtigkeit", band: "A", comment: "" },
      ],
    });
    assert.equal(r.overallScore, 0);
    assert.equal(r.zeroedReason, "Thema verfehlt");
    assert.ok(r.criteriaScores.every((c) => c.score === 0));
    assert.match(r.resultLabel, /Thema verfehlt/);
    assertSelfConsistent(r);
  });

  it("is recorded but not penalised at A1 and A2, which have no such rule", () => {
    for (const rubric of [A1, A2]) {
      const r = run(rubric, {
        themaVerfehlt: true,
        leitpunktCoverage: cover(["ADDRESSED", "ADDRESSED", "ADDRESSED"]),
        criteriaVerdicts: [{ key: "kommunikativeGestaltung", band: "A", comment: "" }],
      });
      assert.equal(r.zeroedReason, null, `${rubric.level} invented a zeroing rule`);
      assert.equal(r.overallScore, 10);
    }
  });
});

describe("the content row describes only the marks that count", () => {
  it("does not call a deliberately skipped A2 point unerfüllt", () => {
    const r = run(A2, {
      leitpunktCoverage: cover(["ADDRESSED", "ADDRESSED", "ADDRESSED", "MISSING"]),
      criteriaVerdicts: [{ key: "kommunikativeGestaltung", band: "A", comment: "" }],
    });
    const content = r.criteriaScores[0];
    assert.ok(!content.bandDescriptor.includes("nicht erfüllt"));
    assert.equal(content.comment, "3 von 3 gewerteten Inhaltspunkten voll erfüllt.");
  });

  it("carries no band letter, since it is a sum rather than a judgement", () => {
    const r = run(A1, {
      leitpunktCoverage: cover(["ADDRESSED", "PARTIAL", "MISSING"]),
      criteriaVerdicts: [{ key: "kommunikativeGestaltung", band: "B", comment: "" }],
    });
    assert.equal(r.criteriaScores[0].band, undefined);
    assert.equal(r.criteriaScores[0].score, 4.5);
    assert.equal(r.overallScore, 5);
    assertSelfConsistent(r);
  });
});
