import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { progressImpact } from "@/components/delete-essay-button";

/**
 * What the delete dialog tells a learner they are about to lose.
 *
 * The trap here is the same one `progress.ts` guards: scales differ between levels, so
 * the percentage the dialog quotes has to be a ratio resolved against that evaluation's
 * own maximum. A dialog that says "its 9.5% will leave your A2 progress" for a 9.5/10 is
 * quoting the raw mark as though it were a percentage, and the learner reads it as a
 * near-total failure they are deleting rather than a near-perfect one.
 */
describe("progressImpact", () => {
  it("says nothing about a score the essay never had", () => {
    // An unevaluated essay takes no score out of the card, so the dialog keeps its
    // original wording rather than inventing a consequence to announce.
    assert.equal(progressImpact("B1", null, false), null);
    assert.equal(progressImpact("B1", null, true), null);
  });

  it("warns that a lone essay empties its level rather than shifting it", () => {
    const text = progressImpact("A2", 95, true);
    assert.ok(text);
    assert.match(text, /only A2 essay/);
    assert.match(text, /back to empty/);
    // The percentage is deliberately absent: what goes is the whole level, and quoting
    // a number invites reading it as an average that merely moves.
    assert.doesNotMatch(text, /95/);
  });

  it("names the score and the level it leaves", () => {
    const text = progressImpact("B1", 87, false);
    assert.ok(text);
    assert.match(text, /87%/);
    assert.match(text, /B1 progress/);
    assert.match(text, /average and best/);
  });

  it("names a rule zero like any other score", () => {
    // Deleting a zeroed essay RAISES the average, which is exactly why it is worth
    // naming — and why it must not be mistaken for the empty-level case.
    const text = progressImpact("B1", 0, false);
    assert.ok(text);
    assert.match(text, /0%/);
    assert.doesNotMatch(text, /back to empty/);
  });

  it("quotes a whole percent, not the raw mark off a level's own scale", () => {
    // 9.5/10 at A2 and 39/45 at B1 are both already-resolved percentages by the time
    // they arrive here; the dialog must print them unchanged and add no decimals.
    assert.match(progressImpact("A2", 95, false)!, /Its 95%/);
    assert.match(progressImpact("B1", 87, false)!, /Its 87%/);
    assert.doesNotMatch(progressImpact("A2", 95, false)!, /9\.5/);
  });
});
