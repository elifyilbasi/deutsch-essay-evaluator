import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { displayStatus, needsEvaluation } from "@/lib/essayStatus";
import { EssayStatus } from "@/generated/prisma/client";

/**
 * "Evaluated" is derived from the Evaluation row, not stored a second time on the
 * essay. It used to be both, and the two drifted: an essay whose evaluation had been
 * deleted still said EVALUATED, so the dashboard showed an "Evaluated" badge next to
 * a page reading "This essay hasn't been evaluated yet".
 */

describe("displayStatus", () => {
  it("calls an essay evaluated when, and only when, an evaluation exists", () => {
    assert.equal(displayStatus({ status: "SUBMITTED", hasEvaluation: true }), "evaluated");
    assert.equal(displayStatus({ status: "SUBMITTED", hasEvaluation: false }), "submitted");
  });

  it("treats a submitted essay with no evaluation as awaiting one", () => {
    // A real state since the essay is saved before the paid call: either the model
    // failed or its result never landed. The user's text is safe either way.
    assert.equal(displayStatus({ status: "SUBMITTED", hasEvaluation: false }), "submitted");
    assert.equal(needsEvaluation({ status: "SUBMITTED", hasEvaluation: false }), true);
    assert.equal(needsEvaluation({ status: "SUBMITTED", hasEvaluation: true }), false);
  });

  it("keeps DRAFT distinct — never submitted is not the same as never scored", () => {
    assert.equal(displayStatus({ status: "DRAFT", hasEvaluation: false }), "draft");
    assert.equal(needsEvaluation({ status: "DRAFT", hasEvaluation: false }), false);
  });

  it("lets the evaluation win over a stale column", () => {
    // Whatever the column says, a row that exists means the work was done and paid for.
    assert.equal(displayStatus({ status: "DRAFT", hasEvaluation: true }), "evaluated");
  });
});

describe("the schema cannot express 'evaluated' any more", () => {
  it("has no EVALUATED value in EssayStatus", () => {
    // The guard against reintroducing the duplicate fact. If someone adds it back,
    // this fails before the two representations get a chance to disagree.
    assert.deepEqual(Object.values(EssayStatus).sort(), ["DRAFT", "SUBMITTED"]);
  });
});
