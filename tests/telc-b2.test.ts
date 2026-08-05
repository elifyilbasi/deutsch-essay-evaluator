import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRubric } from "@/lib/rubrics";
import { buildPrompt, buildResponseSchema } from "@/lib/gemini";
import { maxRawScore, resolveBand, scoreFromBands } from "@/lib/rubrics/types";
import { checkEssayLength } from "@/lib/essayLimits";
import { representativeTask } from "./fixtures";

/**
 * telc Deutsch B2, Schriftlicher Ausdruck, against telc's own published criteria —
 * Übungstest 1, überarbeitete Auflage 2019, transcribed in
 * exam-materials/telc/b2/BEWERTUNGSKRITERIEN.md.
 *
 * These assertions exist because the rubric was first built from a Klett-Langenscheidt
 * Modelltest (2013) reproducing a superseded format, and was wrong in four ways that each
 * moved marks: Kriterium I was holistic instead of a count, an A* band was offered that
 * telc does not have, Thema verfehlt did not zero the task, and the letter's apparatus was
 * marked under Kriterium I. Every one of those is pinned below.
 */

const B2 = getRubric("TELC", "B2")!;
const kriterium = (key: string) => B2.criteria.find((c) => c.key === key)!;
const allBands = (letter: "A" | "B" | "C" | "D") => ({
  aufgabenbewaeltigung: letter,
  kommunikativeGestaltung: letter,
  formaleRichtigkeit: letter,
});

describe("telc B2 scoring", () => {
  it("reaches exactly the 45 points telc states", () => {
    // "Die Punktzahl ... ist die Summe der Punkte, die für die drei Kriterien vergeben
    // wurden. In der telc Zentrale wird diese Punktzahl mit drei multipliziert ... maximal
    // 45 Punkte ... 15 % der ... Gesamtpunktzahl von 300 Punkten."
    assert.equal(maxRawScore(B2, 4), 15);
    const perfect = scoreFromBands({
      rubric: B2,
      bands: allBands("A"),
      themaVerfehlt: false,
      leitpunktCount: 4,
    });
    assert.equal(perfect.total, 45);
    assert.equal(perfect.maxTotal, 45);
  });

  it("uses 5/3/1/0 on every criterion", () => {
    for (const c of B2.criteria) {
      assert.deepEqual(
        c.bands.map((b) => [b.band, b.points]),
        [
          ["A", 5],
          ["B", 3],
          ["C", 1],
          ["D", 0],
        ],
        `${c.key} must carry telc's point table`,
      );
    }
  });

  it("offers no band above A", () => {
    // The criteria table reads "A B C D*", where the asterisk footnotes the Thema-verfehlt
    // rule. An A* was once carried here from a 2013 publisher's Modelltest; telc's own 2019
    // paper has no such band, and offering one invented five points of headroom.
    assert.doesNotMatch(JSON.stringify(buildResponseSchema(B2)), /A\*/);
  });
});

describe("telc B2 Kriterium I is a count", () => {
  const k1 = kriterium("aufgabenbewaeltigung");

  it("is named Aufgabenbewältigung and banded by how many points are treated", () => {
    // The old reading called this "Behandlung des Schreibanlasses" and instructed the
    // examiner NOT to count — the exact inverse of the grid.
    assert.match(k1.label, /Aufgabenbewältigung/);
    assert.match(k1.description, /Count how many points are treated/i);
    assert.doesNotMatch(k1.description, /Do NOT band this by counting/i);
  });

  it("puts three points, or two plus a self-chosen aspect, at A", () => {
    const band = (letter: string) => k1.bands.find((b) => b.band === letter)!.descriptor;
    assert.match(band("A"), /Drei Leitpunkte bzw\. zwei Leitpunkte und ein weiterer/);
    assert.match(band("B"), /Zwei Leitpunkte bzw\. ein Leitpunkt und ein weiterer/);
    assert.match(band("C"), /Ein Leitpunkt bzw\. ein weiterer/);
    assert.match(band("D"), /Kein Leitpunkt/);
  });

  it("expects three treated points, only two of which must be printed", () => {
    assert.deepEqual(
      {
        min: B2.selfChosenAspects?.minLeitpunkte,
        total: B2.selfChosenAspects?.expectedTotal,
      },
      { min: 2, total: 3 },
    );
  });

  it("requires more than one Satzgefüge before a point counts", () => {
    // telc's own threshold, and the opposite of B1's, where a single short sentence does.
    assert.match(B2.leitpunktStatusGuidance!.ADDRESSED, /mehr als ein einziges Satzgefüge/);
    assert.match(
      getRubric("TELC", "B1")!.leitpunktStatusGuidance!.ADDRESSED,
      /Ein einziger, auch kurzer Satz genügt/,
    );
  });
});

describe("telc B2 zero-out rules", () => {
  it("zeroes the whole task for Thema verfehlt", () => {
    // "Hat der Text mit dem Schreibanlass keine oder kaum eine Verbindung, muss bei allen
    // Kriterien D vergeben werden." The old reading declared no such rule at all.
    assert.equal(B2.themaVerfehltZeroesTask, true);
    const off = scoreFromBands({
      rubric: B2,
      bands: allBands("A"),
      themaVerfehlt: true,
      leitpunktCount: 4,
    });
    assert.equal(off.total, 0);
    assert.equal(off.zeroedReason, "Thema verfehlt");
  });

  it("keeps Situierung verfehlt out of the zeroing rule", () => {
    // Right topic, wrong situation: only Kriterium I is D and the language criteria are
    // still marked. That is a band choice, not a zero — themaVerfehlt must stay false.
    const situierung = scoreFromBands({
      rubric: B2,
      bands: {
        aufgabenbewaeltigung: "D",
        kommunikativeGestaltung: "A",
        formaleRichtigkeit: "A",
      },
      themaVerfehlt: false,
      leitpunktCount: 4,
    });
    assert.equal(situierung.zeroedReason, null);
    assert.equal(situierung.total, 30);
    assert.match(kriterium("aufgabenbewaeltigung").description, /only THIS criterion is D/);
  });

  it("lets a D on Formale Richtigkeit leave the other two alone", () => {
    // "Wird Kriterium III mit D bewertet, können die Kriterien I und II mit C, B oder A
    // bewertet sein."
    assert.ok(B2.criteria.every((c) => !c.zeroesWholeTask));
    const failedForm = scoreFromBands({
      rubric: B2,
      bands: {
        aufgabenbewaeltigung: "A",
        kommunikativeGestaltung: "A",
        formaleRichtigkeit: "D",
      },
      themaVerfehlt: false,
      leitpunktCount: 4,
    });
    assert.equal(failedForm.zeroedReason, null);
    assert.equal(failedForm.total, 30);
  });
});

describe("telc B2 Textsorte", () => {
  it("does not require the letter's apparatus, and says so under Kriterium II", () => {
    // "Bei dieser Aufgabe soll eine (halb-)formelle E-Mail verfasst werden. Daher sind
    // Textsortenmerkmale des Briefes (Absender, Empfänger, Datum) nicht gefordert."
    // This was once asserted the other way under Kriterium I, costing a letter a band.
    assert.match(
      kriterium("kommunikativeGestaltung").description,
      /Absender, Empfänger, Datum — are explicitly nicht gefordert/,
    );
    assert.doesNotMatch(kriterium("aufgabenbewaeltigung").description, /Absender/);
  });

  it("withholds A only for missing Textsortenmerkmale AND thin vocabulary", () => {
    // A conjunction in the source; either alone is not enough.
    assert.match(
      kriterium("kommunikativeGestaltung").description,
      /Betreffzeile, Anrede, Schlussformel\) are missing AND the Wortschatzspektrum/,
    );
  });

  it("tells the model the Betreff cannot withhold a band by itself", () => {
    assert.match(buildPrompt(representativeTask(B2)), /must not withhold a band on its own/i);
  });
});

describe("telc B2 length", () => {
  it("sets a floor and no ceiling", () => {
    assert.equal(B2.minWords, 150);
    assert.equal(B2.maxWords, null);
  });

  it("accepts a long letter rather than refusing it", () => {
    const long = Array.from({ length: 400 }, () => "Wort").join(" ");
    assert.equal(checkEssayLength(long, B2, 400), null);
  });

  it("still enforces the character stop, which is the real defence", () => {
    assert.ok(checkEssayLength("a".repeat(6000), B2, 1));
  });
});

describe("band resolution", () => {
  it("resolves a letter the criterion defines", () => {
    const k3 = kriterium("formaleRichtigkeit");
    assert.equal(resolveBand(k3, "A")?.points, 5);
    assert.equal(resolveBand(k3, "D")?.points, 0);
  });

  it("resolves nothing for an absent verdict, so the caller can fall back", () => {
    assert.equal(resolveBand(kriterium("formaleRichtigkeit"), undefined), undefined);
  });
});
