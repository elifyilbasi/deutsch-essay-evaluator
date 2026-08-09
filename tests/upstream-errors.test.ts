import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeQuotaLimit,
  isOverloadedError,
  isQuotaError,
  retryWhileOverloaded,
  upstreamFailureMessage,
} from "@/lib/gemini";

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

  it("declines a retry it has no time left to finish", async () => {
    // The failure this exists for: three attempts at a busy model plus four seconds of
    // backoff is what pushed a submission past the platform's 60s ceiling, where the
    // function is killed and nothing gets to answer. A retry that cannot finish is not a
    // second chance — it spends the last of the budget.
    let calls = 0;
    const { waited, wait } = recorder();
    await assert.rejects(
      retryWhileOverloaded(
        async () => {
          calls++;
          throw apiError(503, "UNAVAILABLE");
        },
        // Already past the deadline, so the first failure is the last.
        { wait, deadline: Date.now() - 1 },
      ),
      /UNAVAILABLE/,
      "rethrows the model's own error, since nothing has actually timed out",
    );
    assert.equal(calls, 1, "must not start an attempt it cannot finish");
    assert.deepEqual(waited, [], "and must not sleep towards it either");
  });

  it("still retries when the deadline leaves room", async () => {
    let calls = 0;
    const { wait } = recorder();
    const result = await retryWhileOverloaded(
      async () => {
        calls++;
        if (calls < 2) throw apiError(503, "UNAVAILABLE");
        return "verdict";
      },
      { wait, deadline: Date.now() + 60_000 },
    );
    assert.equal(result, "verdict");
    assert.equal(calls, 2, "a generous deadline must not suppress a viable retry");
  });

  it("does not wait at all when the first attempt works", async () => {
    const { waited, wait } = recorder();
    assert.equal(await retryWhileOverloaded(async () => "ok", { wait }), "ok");
    assert.deepEqual(waited, []);
  });
});

/**
 * Which quota was hit, and therefore what the learner is told.
 *
 * `isQuotaError` decides the refund; this decides the sentence, and the two are different
 * questions. Every 429 used to answer "please try again in a few minutes" — correct for
 * the per-minute quota, false for the per-day one. On the free tier the daily allowance is
 * the small one (20 requests for gemini-3.6-flash), so the message that could not come
 * true was the one people actually met, and it sent them retrying for the rest of the day.
 */

/** Verbatim shape of a real free-tier refusal, trimmed to the parts that are matched. */
const dailyQuotaError = Object.assign(
  new Error(
    JSON.stringify({
      error: {
        code: 429,
        message:
          "You exceeded your current quota, please check your plan and billing details. " +
          "* Quota exceeded for metric: generativelanguage.googleapis.com/" +
          "generate_content_free_tier_requests, limit: 20, model: gemini-3.6-flash " +
          "Please retry in 48.647673816s.",
        status: "RESOURCE_EXHAUSTED",
        details: [
          {
            "@type": "type.googleapis.com/google.rpc.QuotaFailure",
            violations: [
              {
                quotaMetric:
                  "generativelanguage.googleapis.com/generate_content_free_tier_requests",
                quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
                quotaValue: "20",
              },
            ],
          },
          { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "48s" },
        ],
      },
    }),
  ),
  { status: 429, name: "ApiError" },
);

describe("naming the quota that was hit", () => {
  it("reads the day window and Google's own delay off a real refusal", () => {
    assert.deepEqual(describeQuotaLimit(dailyQuotaError), {
      window: "day",
      retryAfterSeconds: 48,
    });
  });

  it("rounds a fractional delay up rather than down", () => {
    // Google reports 48.647673816s in the prose; a delay is not over until it is over.
    const fractional = new Error('{"details":[{"retryDelay":"48.6s"}]}');
    assert.equal(describeQuotaLimit(fractional).retryAfterSeconds, 49);
  });

  it("tells a per-minute quota apart from a per-day one", () => {
    const perMinute = new Error('{"quotaId":"GenerateRequestsPerMinutePerProject-FreeTier"}');
    assert.equal(describeQuotaLimit(perMinute).window, "minute");
  });

  it("says unknown rather than guessing when no quota is named", () => {
    // The bug being fixed was a confident wrong answer, so silence has to be reachable.
    assert.deepEqual(describeQuotaLimit(new Error("RESOURCE_EXHAUSTED")), {
      window: "unknown",
      retryAfterSeconds: null,
    });
  });

  it("survives values that are not errors at all", () => {
    for (const value of [null, undefined, 429, "429", {}, []]) {
      assert.deepEqual(describeQuotaLimit(value), {
        window: "unknown",
        retryAfterSeconds: null,
      });
    }
  });
});

describe("what the learner is told", () => {
  it("sends someone who hit the daily quota away until tomorrow", () => {
    const message = upstreamFailureMessage(dailyQuotaError);
    assert.match(message, /tomorrow/);
    assert.doesNotMatch(message, /minute/);
  });

  it("promises no time at all when Google named no quota", () => {
    const message = upstreamFailureMessage(
      Object.assign(new Error("RESOURCE_EXHAUSTED"), { status: 429 }),
    );
    assert.match(message, /later/);
    assert.doesNotMatch(message, /tomorrow|minute/);
  });

  it("still says a minute for an overloaded model, which really is a minute", () => {
    const busy = Object.assign(new Error("503 UNAVAILABLE"), { status: 503 });
    assert.match(upstreamFailureMessage(busy), /minute/);
  });

  it("always says the text is safe and nothing was charged", () => {
    // True on every path that reaches this helper, and the reason it reassures rather
    // than alarms. A branch that forgot it would read as lost work.
    for (const error of [
      dailyQuotaError,
      Object.assign(new Error("RESOURCE_EXHAUSTED"), { status: 429 }),
      Object.assign(new Error("503 UNAVAILABLE"), { status: 503 }),
    ]) {
      const message = upstreamFailureMessage(error);
      assert.match(message, /text has been saved/);
      assert.match(message, /did not use up one of your evaluations/);
    }
  });
});
