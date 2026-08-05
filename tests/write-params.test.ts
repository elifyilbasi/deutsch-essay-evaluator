import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseWriteParams, visibleCountFor, LEVELS, INSTITUTES } from "@/lib/writeParams";

/**
 * A "revise this task" link may only preselect what the wizard would let you pick by
 * hand. The disabled-level rejection is the thing most likely to regress the day B2
 * ships, since enabling it in the list is the obvious change and forgetting the
 * parser is the easy miss.
 */

const params = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });

const valid = { institute: "TELC", level: "B1", promptId: "abc123" };

describe("parseWriteParams", () => {
  it("accepts a complete link to an enabled institute and level", () => {
    assert.deepEqual(parseWriteParams(params(valid)), {
      institute: "TELC",
      level: "B1",
      promptId: "abc123",
    });
  });

  it("follows the list rather than a hardcoded level", () => {
    // This used to assert on B2 by name and broke the day B2 shipped, which is the very
    // regression the file header warns about — from the other side. Driven off LEVELS,
    // it keeps testing the guard as levels are switched on, and starts covering the next
    // disabled one the moment it is added.
    for (const { value, enabled } of LEVELS) {
      const parsed = parseWriteParams(params({ ...valid, level: value }));
      assert.equal(
        parsed !== null,
        enabled,
        `${value} is ${enabled ? "enabled" : "disabled"} in LEVELS but the parser ${
          parsed ? "accepted" : "rejected"
        } it`,
      );
    }
  });

  it("rejects a level that is not on the ladder at all", () => {
    // C1 was dropped from LEVELS rather than left permanently disabled, so it is now an
    // unknown value rather than a known-but-off one. Both must be refused, by different
    // branches: `enabledValue` finds no match here, instead of finding one and failing
    // its `enabled` check.
    assert.equal(parseWriteParams(params({ ...valid, level: "C1" })), null);
  });

  it("rejects an institute that is not enabled yet", () => {
    assert.equal(parseWriteParams(params({ ...valid, institute: "GOETHE" })), null);
  });

  it("rejects prototype keys rather than treating them as values", () => {
    for (const key of ["constructor", "toString", "__proto__", "valueOf"]) {
      assert.equal(parseWriteParams(params({ ...valid, institute: key })), null);
      assert.equal(parseWriteParams(params({ ...valid, level: key })), null);
    }
  });

  it("rejects wrong case and empty values", () => {
    assert.equal(parseWriteParams(params({ ...valid, level: "b1" })), null);
    assert.equal(parseWriteParams(params({ ...valid, institute: "telc" })), null);
    assert.equal(parseWriteParams(params({ ...valid, promptId: "" })), null);
  });

  it("rejects a partial link rather than half-applying it", () => {
    assert.equal(parseWriteParams(params({ institute: "TELC", level: "B1" })), null);
    assert.equal(parseWriteParams(params({ promptId: "abc123" })), null);
    assert.equal(parseWriteParams(params({})), null);
  });

  it("only ever returns values the wizard actually offers", () => {
    const parsed = parseWriteParams(params(valid))!;
    assert.ok(INSTITUTES.some((i) => i.value === parsed.institute && i.enabled));
    assert.ok(LEVELS.some((l) => l.value === parsed.level && l.enabled));
  });
});

describe("visibleCountFor", () => {
  it("leaves the count alone when the task is already visible", () => {
    assert.equal(visibleCountFor(0, 3), 3);
    assert.equal(visibleCountFor(2, 3), 3);
  });

  it("reveals a task sitting past the fold", () => {
    assert.equal(visibleCountFor(3, 3), 6);
    assert.equal(visibleCountFor(5, 3), 6);
    assert.equal(visibleCountFor(6, 3), 9);
  });

  it("never shrinks an already-expanded list", () => {
    assert.equal(visibleCountFor(0, 3, 9), 9);
  });

  it("handles a task that is not in the list", () => {
    assert.equal(visibleCountFor(-1, 3), 3);
  });
});
