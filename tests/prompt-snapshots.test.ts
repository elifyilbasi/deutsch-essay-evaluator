import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPrompt, buildResponseSchema } from "@/lib/gemini";
import { representativeTask, rubricsUnderTest } from "./fixtures";

/**
 * Golden copies of what each level actually sends to the model.
 *
 * The structural tests catch a prompt that contradicts its rubric. These catch the
 * other half of the same failure: a rubric that was corrected while the prose around
 * it was not. Every bug of that kind this project has had was invisible in review
 * because the generated text never appeared in a diff — here it does, in plain text,
 * per level.
 *
 * A failure is not necessarily a bug. Read the diff: if the change is intended,
 * regenerate with `npm run test:update` and let the new text be reviewed alongside
 * the rubric change that caused it.
 */

const dir = join(dirname(fileURLToPath(import.meta.url)), "snapshots");
const update = process.env.UPDATE_SNAPSHOTS === "1";

function matchesSnapshot(name: string, actual: string) {
  const file = join(dir, name);
  if (update || !existsSync(file)) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, actual);
    return;
  }
  const expected = readFileSync(file, "utf8");
  assert.equal(
    actual,
    expected,
    `${name} no longer matches what the code generates.\n` +
      `Read the diff. If it is intended, run: npm run test:update`,
  );
}

describe("what each level sends to the model", () => {
  for (const [level, rubric] of rubricsUnderTest) {
    it(`${level}: prompt is unchanged`, () => {
      matchesSnapshot(`${level}.prompt.txt`, buildPrompt(representativeTask(rubric)));
    });

    it(`${level}: response schema is unchanged`, () => {
      const schema = JSON.stringify(buildResponseSchema(rubric), null, 2);
      matchesSnapshot(`${level}.schema.json`, `${schema}\n`);
    });
  }

  it("covers every level the project defines", () => {
    assert.ok(rubricsUnderTest.length > 0);
    for (const [level, rubric] of rubricsUnderTest) {
      assert.doesNotThrow(
        () => representativeTask(rubric),
        `level ${level} has no fixture, so it is silently untested`,
      );
    }
  });
});
