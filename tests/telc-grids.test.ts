import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { telcRubrics } from "@/lib/rubrics/telc";
import { maxRawScore, scoreFromBands } from "@/lib/rubrics/types";
import type { BandLetter, LeitpunktStatus } from "@/lib/rubrics/types";

/**
 * Each level against the grid it was transcribed from. These are the numbers a
 * telc examiner would put on the mark sheet, so a change here is either a
 * transcription fix with a citation or a bug.
 */

const A1 = telcRubrics.A1!;
const A2 = telcRubrics.A2!;
const B1 = telcRubrics.B1!;

const A: LeitpunktStatus = "ADDRESSED";
const P: LeitpunktStatus = "PARTIAL";
const M: LeitpunktStatus = "MISSING";

describe("telc B1 — Zertifikat Deutsch, Übungstest 1 (2019)", () => {
  const score = (l: BandLetter, kg: BandLetter, fr: BandLetter, themaVerfehlt = false) =>
    scoreFromBands({
      rubric: B1,
      bands: { leitpunkte: l, kommunikativeGestaltung: kg, formaleRichtigkeit: fr },
      themaVerfehlt,
      leitpunktStatuses: [A, A, A, A],
    });

  it("bands three criteria at 5/3/1/0 for a maximum of 45", () => {
    assert.equal(B1.criteria.length, 3);
    for (const c of B1.criteria) {
      assert.deepEqual(
        c.bands.map((b) => b.points),
        [5, 3, 1, 0],
      );
    }
    assert.equal(maxRawScore(B1), 15);
    assert.equal(score("A", "A", "A").total, 45);
  });

  // "Wird Kriterium III mit D bewertet, können die Kriterien I und II mit C, B
  // oder A bewertet sein." A D on one criterion never voids the others.
  it("does not void the whole task for a D on a single criterion", () => {
    assert.equal(score("A", "A", "D").total, 30);
    assert.equal(score("D", "B", "B").total, 18);
    assert.ok(!B1.criteria.some((c) => c.zeroesWholeTask));
  });

  it("zeroes everything only for Thema verfehlt", () => {
    const zeroed = score("A", "A", "A", true);
    assert.equal(zeroed.total, 0);
    assert.equal(zeroed.zeroedReason, "Thema verfehlt");
  });

  it("has no Zusatzpunkte — the total is the sum of the three criteria", () => {
    assert.equal(score("A", "B", "B").total, 33);
  });
});

describe("telc A1 — Start Deutsch 1, Übungstest 1", () => {
  const score = (statuses: LeitpunktStatus[], kg: "A" | "B" | "C", themaVerfehlt = false) =>
    scoreFromBands({
      rubric: A1,
      bands: { kommunikativeGestaltung: kg },
      themaVerfehlt,
      leitpunktStatuses: statuses,
    });

  it("marks each Inhaltspunkt 3 / 1,5 / 0 and KG 1 / 0,5 / 0, max 10", () => {
    assert.deepEqual(A1.contentPointScoring?.points, { ADDRESSED: 3, PARTIAL: 1.5, MISSING: 0 });
    assert.deepEqual(
      A1.criteria[0].bands.map((b) => b.points),
      [1, 0.5, 0],
    );
    assert.equal(maxRawScore(A1, 3), 10);
    assert.equal(score([A, A, A], "A").total, 10);
  });

  it("has no formale-Richtigkeit criterion", () => {
    assert.equal(A1.criteria.length, 1);
    assert.ok(!A1.criteria.some((c) => c.key === "formaleRichtigkeit"));
  });

  it("keeps half marks as halves", () => {
    assert.equal(score([A, A, P], "A").total, 8.5);
    assert.equal(score([P, P, P], "C").total, 4.5);
    assert.equal(score([A, P, M], "B").total, 5);
  });

  it("has no Thema-verfehlt override — an off-topic text simply earns nothing", () => {
    assert.equal(A1.themaVerfehltZeroesTask, false);
    assert.equal(score([A, A, A], "A", true).zeroedReason, null);
    assert.equal(score([M, M, M], "C").total, 0);
  });

  it("marks every Leitpunkt the task sets", () => {
    assert.equal(A1.contentPointScoring?.counted, undefined);
    assert.equal(maxRawScore(A1, 4), 13);
  });
});

describe("telc A2 — Start Deutsch 2, Übungstest 1", () => {
  const score = (statuses: LeitpunktStatus[], kg: "A" | "B" | "C") =>
    scoreFromBands({
      rubric: A2,
      bands: { kommunikativeGestaltung: kg },
      themaVerfehlt: false,
      leitpunktStatuses: statuses,
    });

  it("uses the same grid as A1 — 3 / 1,5 / 0 plus 1 / 0,5 / 0, max 10", () => {
    assert.deepEqual(A2.contentPointScoring?.points, A1.contentPointScoring?.points);
    assert.deepEqual(A2.contentPointScoring?.descriptors, A1.contentPointScoring?.descriptors);
    assert.equal(maxRawScore(A2, 4), 10);
    assert.equal(A2.criteria.length, 1);
  });

  // "Hier finden Sie vier Punkte. Wählen Sie drei aus." The Antwortbogen has three
  // Inhaltspunkt fields, so a point left out on purpose must not cost anything.
  it("marks the best three of four, so a skipped point costs nothing", () => {
    assert.equal(A2.contentPointScoring?.counted, 3);
    assert.equal(score([A, A, A, M], "A").total, 10);
    assert.equal(score([M, A, A, A], "A").total, 10);
    assert.equal(score([A, A, A, A], "A").total, 10, "answering all four is not worth more");
    assert.equal(score([A, A, P, M], "A").total, 8.5);
    assert.equal(score([A, A, M, M], "A").total, 7, "only two answered does cost marks");
  });

  it("scores a half KG mark", () => {
    assert.equal(score([A, A, A, M], "B").total, 9.5);
    assert.equal(score([M, M, M, M], "C").total, 0);
  });
});
