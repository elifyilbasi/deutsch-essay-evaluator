import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOverloadedError, isQuotaError, retryWhileOverloaded } from "@/lib/gemini";

/**
 * Which upstream failures cost the learner a slot.
 *
 * A B2 essay was once saved and then stranded: Google returned 503 UNAVAILABLE, the
 * submission route had no branch for it, and the learner was charged a day's evaluation
 * for a call the model never took — with no way to ever score the text. Both predicates
 * below decide a refund, so getting either wrong bills someone for our upstream's
 * capacity.
 *
 * They must stay disjoint. `isOverloadedError` additionally drives the retry in
 * `evaluateEssay`, and retrying a 429 is exactly the wrong move: it turns a brief rate
 * limit into a longer one.
 */

/** Shaped like what @google/genai throws: a status plus a JSON body in the message. */
const apiError = (code: number, status: string) =>
  Object.assign(new Error(JSON.stringify({ error: { code, message: "…", status } })), {
    status: code,
    name: "ApiError",
  });

describe("upstream failure classification", () => {
  it("treats a busy model as overloaded, not as a quota problem", () => {
    const busy = apiError(503, "UNAVAILABLE");
    assert.equal(isOverloadedError(busy), true);
    assert.equal(isQuotaError(busy), false);
  });

  it("treats a rate limit as a quota problem, not as overload", () => {
    // If this ever returned true, evaluateEssay would retry a 429 and make it worse.
    const limited = apiError(429, "RESOURCE_EXHAUSTED");
    assert.equal(isQuotaError(limited), true);
    assert.equal(isOverloadedError(limited), false);
  });

  it("claims neither for a fault that did reach the model", () => {
    // A 400 or a malformed verdict is our bug, and the call was really paid for — so it
    // is not refunded and must not be retried.
    for (const error of [apiError(400, "INVALID_ARGUMENT"), new Error("Gemini returned an empty response.")]) {
      assert.equal(isQuotaError(error), false);
      assert.equal(isOverloadedError(error), false);
    }
  });

  it("recognises the failure from its message when no status is attached", () => {
    // Transport-level wrappers lose the numeric status but keep the body.
    assert.equal(isOverloadedError(new Error("got 503 UNAVAILABLE from upstream")), true);
    assert.equal(isQuotaError(new Error("RESOURCE_EXHAUSTED")), true);
  });

  it("survives values that are not errors at all", () => {
    for (const value of [null, undefined, "503", 503, {}]) {
      assert.equal(isOverloadedError(value), false);
      assert.equal(isQuotaError(value), false);
    }
  });
});

describe("retry while overloaded", () => {
  /** Records the waits instead of serving them, so the test costs no real time. */
  const recorder = () => {
    const waited: number[] = [];
    return { waited, wait: async (ms: number) => void waited.push(ms) };
  };

  it("succeeds on a later attempt after the model frees up", async () => {
    let calls = 0;
    const { waited, wait } = recorder();
    const result = await retryWhileOverloaded(
      async () => {
        calls++;
        if (calls < 3) throw apiError(503, "UNAVAILABLE");
        return "verdict";
      },
      { wait },
    );
    assert.equal(result, "verdict");
    assert.equal(calls, 3, "should have tried three times");
    assert.deepEqual(waited, [1000, 3000], "backs off between attempts");
  });

  it("gives up after the last attempt and rethrows the real error", async () => {
    let calls = 0;
    const { wait } = recorder();
    await assert.rejects(
      retryWhileOverloaded(async () => {
        calls++;
        throw apiError(503, "UNAVAILABLE");
      }, { wait }),
      /UNAVAILABLE/,
    );
    // Bounded: a learner is holding a request open behind this.
    assert.equal(calls, 3);
  });

  it("never retries a rate limit", async () => {
    // Retrying a 429 is what turns a brief limit into a long one, and the route refunds
    // and reports it instead.
    let calls = 0;
    const { wait } = recorder();
    await assert.rejects(
      retryWhileOverloaded(async () => {
        calls++;
        throw apiError(429, "RESOURCE_EXHAUSTED");
      }, { wait }),
      /RESOURCE_EXHAUSTED/,
    );
    assert.equal(calls, 1, "a 429 must fail on the first attempt");
  });

  it("never retries a fault that already reached the model", async () => {
    let calls = 0;
    const { wait } = recorder();
    await assert.rejects(
      retryWhileOverloaded(async () => {
        calls++;
        throw new Error("Gemini returned an empty response.");
      }, { wait }),
      /empty response/,
    );
    assert.equal(calls, 1, "repeating it would buy the same answer twice");
  });

  it("does not wait at all when the first attempt works", async () => {
    const { waited, wait } = recorder();
    assert.equal(await retryWhileOverloaded(async () => "ok", { wait }), "ok");
    assert.deepEqual(waited, []);
  });
});
