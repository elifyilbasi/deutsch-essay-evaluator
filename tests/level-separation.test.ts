import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRubric, telcRubrics } from "@/lib/rubrics";
import { buildResponseSchema } from "@/lib/gemini";
import type { LevelRubric } from "@/lib/rubrics/types";

/**
 * Every level is scored on its own institute's rules and nothing else. This has
 * been broken twice: once by a rubric inheriting another level's criteria, once by
 * a shared response schema shipping B1's rules with every A1 request.
 */

const A1 = telcRubrics.A1!;
const A2 = telcRubrics.A2!;
const B1 = telcRubrics.B1!;
const defined = Object.entries(telcRubrics) as [string, LevelRubric][];

/** Everything about a rubric that decides a score. */
const rules = (r: LevelRubric) =>
  JSON.stringify({
    keys: r.criteria.map((c) => c.key),
    points: r.criteria.map((c) => c.bands.map((b) => b.points)),
    multiplier: r.scoreMultiplier,
    contentPoints: r.contentPointScoring?.points ?? null,
    counted: r.contentPointScoring?.counted ?? null,
    themaVerfehlt: r.themaVerfehltZeroesTask,
  });

describe("rubric lookup", () => {
  it("never falls back to another level or institute", () => {
    assert.equal(getRubric("TELC", "B2"), undefined);
    assert.equal(getRubric("TELC", "C1"), undefined);
    assert.equal(getRubric("GOETHE", "B1"), undefined);
    assert.equal(getRubric("GOETHE", "A1"), undefined, "Goethe must not borrow telc's A1");
  });

  it("gives every rubric a level field matching its key", () => {
    for (const [key, rubric] of defined) assert.equal(rubric.level, key);
  });
});

describe("levels do not share state", () => {
  it("gives each level its own criteria objects", () => {
    for (const [k1, r1] of defined) {
      for (const [k2, r2] of defined) {
        if (k1 >= k2) continue;
        assert.notEqual(r1.criteria, r2.criteria, `${k1} and ${k2} share a criteria array`);
        assert.ok(
          !r1.criteria.some((c) => r2.criteria.includes(c)),
          `${k1} and ${k2} share a criterion object`,
        );
      }
    }
  });

  it("gives each level genuinely different rules, not just different labels", () => {
    assert.notEqual(rules(A1), rules(B1));
    assert.notEqual(rules(A2), rules(B1));
    assert.notEqual(rules(A1), rules(A2), "A2 marks three of four; A1 marks every point");
  });

  it("marks every level as verified against an official grid", () => {
    for (const [key, rubric] of defined) {
      assert.equal(rubric.verified, true, `${key} is not verified`);
    }
  });
});

describe("response schema carries only its own level's rules", () => {
  const schema = (r: LevelRubric) => JSON.stringify(buildResponseSchema(r));
  const bandEnum = (r: LevelRubric) =>
    buildResponseSchema(r).properties.criteriaVerdicts.items.properties.band.enum;

  it("states the zeroing rule only where the level has one", () => {
    assert.ok(schema(B1).includes("zeroes the whole letter"));
    assert.ok(!schema(A1).includes("zeroes the whole letter"));
    assert.ok(!schema(A2).includes("zeroes the whole letter"));
  });

  it("offers only the band letters the level actually defines", () => {
    assert.deepEqual(bandEnum(B1), ["A", "B", "C", "D"]);
    assert.deepEqual(bandEnum(A1), ["A", "B", "C"], "A1's KG is a three-way split");
    assert.deepEqual(bandEnum(A2), ["A", "B", "C"]);
  });

  it("describes the coverage statuses in each level's own terms", () => {
    const status = (r: LevelRubric) =>
      buildResponseSchema(r).properties.leitpunktCoverage.items.properties.status.description;
    assert.notEqual(status(A1), status(B1));
    // B1 counts a Leitpunkt as erfüllt on a single short sentence; the generic
    // wording ("adequate detail") is stricter than the grid and under-marks it.
    assert.ok(String(status(B1)).includes("Ein einziger, auch kurzer Satz genügt"));
    assert.ok(String(status(A1)).includes("Aufgabe voll erfüllt"));
  });

  it("offers Zusatzpunkte nowhere — no telc grid provides for them", () => {
    for (const [, rubric] of defined) assert.ok(!schema(rubric).includes("Zusatzpunkte"));
  });
});
