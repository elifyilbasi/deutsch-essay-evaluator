import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEnumValue } from "@/lib/parseEnum";
import { Institute, Level } from "@/generated/prisma/client";

/**
 * The previous check was `value in Institute`. The generated enums are plain object
 * literals, so `in` also matched everything on Object.prototype: `?institute=constructor`
 * passed validation, was cast to Institute, and reached Prisma as an invalid enum
 * value — a body-less 500 from a crafted query string.
 */

describe("parseEnumValue", () => {
  it("accepts real enum values", () => {
    assert.equal(parseEnumValue(Institute, "TELC"), "TELC");
    assert.equal(parseEnumValue(Institute, "GOETHE"), "GOETHE");
    assert.equal(parseEnumValue(Level, "B1"), "B1");
    assert.equal(parseEnumValue(Level, "A1"), "A1");
  });

  it("rejects inherited Object.prototype keys", () => {
    for (const key of ["constructor", "toString", "valueOf", "hasOwnProperty", "__proto__"]) {
      assert.equal(parseEnumValue(Institute, key), null, `${key} passed validation`);
      assert.equal(parseEnumValue(Level, key), null, `${key} passed validation`);
    }
  });

  it("rejects empty, missing and wrongly-cased input", () => {
    assert.equal(parseEnumValue(Institute, ""), null);
    assert.equal(parseEnumValue(Institute, null), null);
    assert.equal(parseEnumValue(Institute, undefined), null);
    assert.equal(parseEnumValue(Institute, "telc"), null, "enum values are case-sensitive");
    assert.equal(parseEnumValue(Level, "b1"), null);
  });

  it("rejects a key of the enum rather than a value", () => {
    // Guards against a future enum whose keys and values diverge.
    for (const key of Object.keys(Institute)) {
      const value = (Institute as Record<string, string>)[key];
      if (key !== value) assert.equal(parseEnumValue(Institute, key), null);
    }
  });
});
