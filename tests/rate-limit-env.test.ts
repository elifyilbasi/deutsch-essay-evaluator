import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { readLimitEnv } from "@/lib/rateLimit";

/**
 * `Number("")` is 0, not NaN. That single fact turned an unfilled environment
 * variable into a configured limit of zero, and zero means "refuse everything" for
 * both quota settings — so a variable that merely existed switched the product off.
 * The empty and whitespace cases below are the whole reason this file exists.
 */

describe("readLimitEnv", () => {
  it("treats an unfilled variable as absent, not as zero", () => {
    assert.equal(readLimitEnv(""), null);
    assert.equal(readLimitEnv("   "), null);
    assert.equal(readLimitEnv(undefined), null);
  });

  it("still honours an explicit zero", () => {
    // The documented way to switch evaluations off; it must stay distinguishable
    // from "not configured".
    assert.equal(readLimitEnv("0"), 0);
  });

  it("accepts whole numbers, with surrounding whitespace", () => {
    assert.equal(readLimitEnv("5"), 5);
    assert.equal(readLimitEnv("200"), 200);
    assert.equal(readLimitEnv(" 42 "), 42);
  });

  it("rejects anything that is not a whole, non-negative number", () => {
    for (const raw of ["abc", "2.5", "-1", "1e3x", "NaN", "Infinity"]) {
      assert.equal(readLimitEnv(raw), null, `accepted ${JSON.stringify(raw)}`);
    }
  });
});

describe(".env.example", () => {
  const template = readFileSync(
    new URL("../.env.example", import.meta.url),
    "utf8",
  );

  it("never assigns an empty value to a limit variable", () => {
    // The shipped template is what a new developer copies verbatim. An empty
    // assignment here is indistinguishable from a deliberate zero at a glance, and
    // this file previously shipped GLOBAL_DAILY_EVAL_LIMIT="" — which refused every
    // submission on a brand new database.
    const emptyAssignments = template
      .split("\n")
      .filter((line) => /^\s*[A-Z_]*LIMIT[A-Z_]*\s*=\s*("")?\s*$/.test(line));
    assert.deepEqual(emptyAssignments, []);
  });

  it("documents every quota variable the code reads", () => {
    for (const name of ["DAILY_EVAL_LIMIT", "GLOBAL_DAILY_EVAL_LIMIT"]) {
      assert.ok(template.includes(name), `${name} is not mentioned in .env.example`);
    }
  });
});
