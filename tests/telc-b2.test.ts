import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRubric } from "@/lib/rubrics";
import { buildPrompt, buildResponseSchema } from "@/lib/gemini";
import { maxRawScore, scoreFromBands } from "@/lib/rubrics/types";
import { checkEssayLength } from "@/lib/essayLimits";
import { representativeTask } from "./fixtures";

/**
 * telc Deutsch B2, Schriftlicher Ausdruck. The traps here are all "B2 is not a rescaled
 * B1": its first criterion is a holistic judgement rather than a count of Leitpunkte, a
 * self-chosen aspect can stand in for a printed point, it has no Thema-verfehlt override,
 * it has a band above A, and it sets a word floor with no ceiling.
 *
 * Source for every number asserted below: Modelltest TELC Deutsch B2, Klett-Langenscheidt
 * 2013, pp. 38-39, transcribed in exam-materials/telc/b2/BEWERTUNGSKRITERIEN.md.
 */

const B2 = getRubric("TELC", "B2")!;
const bandsFor = (letter: "A*" | "A" | "B" | "C" | "D") => ({
  schreibanlass: letter,
  kommunikativeGestaltung: letter,
  formaleRichtigkeit: letter === "A*" ? ("A" as const) : letter,
});

describe("telc B2 scoring", () => {
  it("reaches exactly the 45 points the paper states", () => {
    // "Die Höchstpunktzahl für diesen Prüfungsteil beträgt 45 Punkte." Three criteria at
    // 5, summed and multiplied by three.
    assert.equal(maxRawScore(B2, 4), 15);
    const perfect = scoreFromBands({
      rubric: B2,
      bands: bandsFor("A"),
      themaVerfehlt: false,
      leitpunktCount: 4,
    });
    assert.equal(perfect.total, 45);
    assert.equal(perfect.maxTotal, 45);
  });

  it("scores A* exactly as A, on the criteria that offer it", () => {
    // A* records that the writing is above B2; it is not worth more.
    const starred = scoreFromBands({
      rubric: B2,
      bands: bandsFor("A*"),
      themaVerfehlt: false,
      leitpunktCount: 4,
    });
    assert.equal(starred.total, 45);
  });

  it("offers A* on the first two criteria only", () => {
    // "In den beiden ersten Kriterien kann auch die Bewertung A* vergeben werden."
    const withStar = B2.criteria
      .filter((c) => c.bands.some((b) => b.band === "A*"))
      .map((c) => c.key);
    assert.deepEqual(withStar, ["schreibanlass", "kommunikativeGestaltung"]);
  });

  it("does not zero the letter for Thema verfehlt", () => {
    // B1 states that override outright; the B2 paper states none, so an off-topic B2
    // letter is graded down through the bands rather than voided.
    assert.equal(B2.themaVerfehltZeroesTask, false);
    const off = scoreFromBands({
      rubric: B2,
      bands: bandsFor("C"),
      themaVerfehlt: true,
      leitpunktCount: 4,
    });
    assert.equal(off.zeroedReason, null);
    assert.equal(off.total, 9);
  });

  it("lets no single criterion zero the whole task", () => {
    assert.ok(B2.criteria.every((c) => !c.zeroesWholeTask));
    const failedForm = scoreFromBands({
      rubric: B2,
      bands: { schreibanlass: "A", kommunikativeGestaltung: "A", formaleRichtigkeit: "D" },
      themaVerfehlt: false,
      leitpunktCount: 4,
    });
    assert.equal(failedForm.zeroedReason, null);
    assert.equal(failedForm.total, 30);
  });
});

describe("telc B2 coverage rule", () => {
  it("expects three treated points, only two of which must be printed", () => {
    // "entweder a) mindestens drei der folgenden Punkte oder b) mindestens zwei der
    // folgenden Punkte und einen weiteren Aspekt Ihrer Wahl."
    assert.deepEqual(
      { min: B2.selfChosenAspects?.minLeitpunkte, total: B2.selfChosenAspects?.expectedTotal },
      { min: 2, total: 3 },
    );
  });

  it("tells the model a self-chosen aspect counts, and not to count Leitpunkte", () => {
    // The failure this guards is the model applying B1's rule at B2: banding Kriterium 1
    // by how many printed points were covered would mark a legitimate option (b) letter
    // down twice, once in coverage and once in the criterion.
    const prompt = buildPrompt(representativeTask(B2));
    assert.match(prompt, /selfChosen=true/);
    assert.match(prompt, /NOT a count of Leitpunkte/);
    assert.doesNotMatch(prompt, /count how many points you marked ADDRESSED/);
  });

  it("keeps B1 counting its Leitpunkte", () => {
    // The same prompt builder serves both, so B2's rule must not leak backwards.
    const b1 = buildPrompt(representativeTask(getRubric("TELC", "B1")!));
    assert.match(b1, /count how many points you marked ADDRESSED/);
    assert.doesNotMatch(b1, /selfChosen/);
  });

  it("offers the A* band to the model at B2 and nowhere else", () => {
    const schema = JSON.stringify(buildResponseSchema(B2));
    assert.match(schema, /"A\*"/);
    const b1Schema = JSON.stringify(buildResponseSchema(getRubric("TELC", "B1")!));
    assert.doesNotMatch(b1Schema, /"A\*"/);
  });
});

describe("telc B2 length", () => {
  it("sets a floor and no ceiling", () => {
    // "Schreiben Sie mindestens 150 Wörter", with no maximum printed anywhere.
    assert.equal(B2.minWords, 150);
    assert.equal(B2.maxWords, null);
  });

  it("accepts a long letter rather than refusing it", () => {
    // A ceiling invented for B2 would have made checkEssayLength refuse honest work:
    // null x WORD_TOLERANCE is 0, which would reject every submission.
    const long = Array.from({ length: 400 }, () => "Wort").join(" ");
    assert.equal(checkEssayLength(long, B2, 400), null);
  });

  it("still enforces the character stop, which is the real defence", () => {
    const huge = "a".repeat(6000);
    assert.ok(checkEssayLength(huge, B2, 1));
  });
});
