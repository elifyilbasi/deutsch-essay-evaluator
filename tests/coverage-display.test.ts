import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readCoverage } from "@/lib/coverageDisplay";
import type { LeitpunktStatus } from "@/lib/rubrics/types";

/**
 * What the Leitpunkte list on the feedback page tells a candidate.
 *
 * The scoring already ignores a point that the level did not require — contentPointMarks
 * counts only the best three at A2, and Kriterium I at B2 bands on a count of three. The
 * display did not: a telc B2 letter that treated three of four points showed "3 of 3
 * required points fully covered" and then a red ✗ "Missing" on the fourth, so the page
 * both passed and failed the same answer. These pin the display to the marking.
 */

const cover = (statuses: LeitpunktStatus[], selfChosenAt?: number) =>
  statuses.map((status, i) => ({ status, selfChosen: i === selfChosenAt }));

describe("a point the level did not require", () => {
  it("is not shown as a failure once the requirement is met", () => {
    // telc B2: four printed, three marked. This is the case from the bug report.
    const { requirementMet, tones } = readCoverage(
      cover(["ADDRESSED", "ADDRESSED", "ADDRESSED", "MISSING"]),
      3,
    );
    assert.equal(requirementMet, true);
    assert.deepEqual(tones, ["ADDRESSED", "ADDRESSED", "ADDRESSED", "NOT_NEEDED"]);
  });

  it("covers a merely PARTIAL leftover too, which costs nothing either", () => {
    const { tones } = readCoverage(
      cover(["ADDRESSED", "ADDRESSED", "ADDRESSED", "PARTIAL"]),
      3,
    );
    assert.equal(tones[3], "NOT_NEEDED");
  });

  it("still reports a real shortfall as a failure", () => {
    // Two treated where three are required: the untreated points genuinely cost marks,
    // so softening them here would hide the reason for the band.
    const { requirementMet, tones } = readCoverage(
      cover(["ADDRESSED", "ADDRESSED", "MISSING", "PARTIAL"]),
      3,
    );
    assert.equal(requirementMet, false);
    assert.deepEqual(tones, ["ADDRESSED", "ADDRESSED", "MISSING", "PARTIAL"]);
  });

  it("requires every printed point where the level marks them all", () => {
    // A1 and B1 pass no expectedTotal, so nothing is optional and a gap stays red.
    const { required, requirementMet, tones } = readCoverage(
      cover(["ADDRESSED", "ADDRESSED", "MISSING"]),
    );
    assert.equal(required, 3);
    assert.equal(requirementMet, false);
    assert.equal(tones[2], "MISSING");
  });
});

describe("the count above the list", () => {
  it("clamps, so covering all four of a three-point task is not 4 of 3", () => {
    const { covered, required } = readCoverage(
      cover(["ADDRESSED", "ADDRESSED", "ADDRESSED", "ADDRESSED"]),
      3,
    );
    assert.equal(covered, 4);
    assert.equal(required, 3);
    assert.equal(Math.min(covered, required), 3);
  });

  it("counts a self-chosen aspect towards the requirement, as telc B2 allows", () => {
    // "zwei Leitpunkte und ein weiterer Aspekt Ihrer Wahl" — two printed plus one own.
    const { covered, requirementMet, ownCovered, tones } = readCoverage(
      [
        { status: "ADDRESSED", selfChosen: false },
        { status: "ADDRESSED", selfChosen: false },
        { status: "MISSING", selfChosen: false },
        { status: "MISSING", selfChosen: false },
        { status: "ADDRESSED", selfChosen: true },
      ],
      3,
    );
    assert.equal(covered, 3);
    assert.equal(ownCovered, 1);
    assert.equal(requirementMet, true);
    // The two printed points passed over are the option the task offers, not failures.
    assert.deepEqual(tones.slice(2, 4), ["NOT_NEEDED", "NOT_NEEDED"]);
  });
});
