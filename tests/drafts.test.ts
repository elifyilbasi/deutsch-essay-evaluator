import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DRAFT_TTL_DAYS,
  MAX_DRAFTS_PER_USER,
  clearDraft,
  draftKey,
  isExpired,
  parseDraft,
  pruneDrafts,
  readDraft,
  serializeDraft,
  writeDraft,
} from "@/lib/drafts";
import type { Draft, StorageLike } from "@/lib/drafts";

/**
 * Drafts are unsent work, so the interesting cases are the ones that lose it or leak
 * it: a key that collides across accounts, a blob that no longer matches its key, a
 * store that is full, and a store the browser refuses to hand over at all.
 */

/** In-memory Storage. `fail` lets a test make setItem throw the way a real one does. */
function fakeStorage(fail?: "quota" | "other"): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      if (fail === "quota") {
        const e = new Error("full") as Error & { name: string; code: number };
        e.name = "QuotaExceededError";
        e.code = 22;
        throw e;
      }
      if (fail === "other") throw new Error("storage is disabled");
      map.set(k, v);
    },
    removeItem: (k) => void map.delete(k),
  };
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

const draft = (over: Partial<Draft> = {}): Draft => ({
  v: 1,
  userId: "user-a",
  promptId: "prompt-1",
  content: "Liebe Sonja,",
  elapsedSeconds: 42,
  updatedAt: NOW,
  ...over,
});

describe("draftKey", () => {
  it("scopes by user, so one account never reads another's draft", () => {
    assert.notEqual(draftKey("user-a", "p1"), draftKey("user-b", "p1"));
    assert.notEqual(draftKey("user-a", "p1"), draftKey("user-a", "p2"));
  });

  it("is versioned, so a future shape change cannot be misread as this one", () => {
    assert.match(draftKey("user-a", "p1"), /^dee:draft:v1:user-a:p1$/);
  });
});

describe("parseDraft", () => {
  const expected = { userId: "user-a", promptId: "prompt-1" };

  it("round-trips a good draft", () => {
    assert.deepEqual(parseDraft(serializeDraft(draft()), expected), draft());
  });

  it("rejects nothing, garbage and non-objects", () => {
    for (const raw of [null, "", "not json", "[]", '"a string"', "42"]) {
      assert.equal(parseDraft(raw, expected), null, `accepted ${JSON.stringify(raw)}`);
    }
  });

  it("rejects a different schema version rather than guessing at it", () => {
    assert.equal(parseDraft(JSON.stringify({ ...draft(), v: 2 }), expected), null);
  });

  it("rejects a blob whose identity disagrees with the key it came from", () => {
    // The guard against a collided or hand-edited entry being trusted.
    assert.equal(parseDraft(serializeDraft(draft({ userId: "user-b" })), expected), null);
    assert.equal(parseDraft(serializeDraft(draft({ promptId: "other" })), expected), null);
  });

  it("rejects wrong-typed fields", () => {
    assert.equal(parseDraft(JSON.stringify({ ...draft(), content: 5 }), expected), null);
    assert.equal(parseDraft(JSON.stringify({ ...draft(), elapsedSeconds: "42" }), expected), null);
    assert.equal(parseDraft(JSON.stringify({ ...draft(), updatedAt: null }), expected), null);
    assert.equal(parseDraft(JSON.stringify({ ...draft(), elapsedSeconds: NaN }), expected), null);
  });
});

describe("expiry", () => {
  it("keeps a draft inside the window and drops one past it", () => {
    assert.equal(isExpired(NOW - 13 * DAY, NOW), false);
    assert.equal(isExpired(NOW - (DRAFT_TTL_DAYS + 1) * DAY, NOW), true);
  });

  it("removes an expired draft on read rather than returning it", () => {
    const s = fakeStorage();
    writeDraft(s, draft({ updatedAt: NOW - 30 * DAY }));
    assert.equal(readDraft(s, "user-a", "prompt-1", NOW), null);
    assert.equal(s.map.size, 0, "the expired entry should be swept up, not left behind");
  });
});

describe("read and write", () => {
  it("stores and retrieves a draft", () => {
    const s = fakeStorage();
    assert.deepEqual(writeDraft(s, draft()), { ok: true });
    assert.deepEqual(readDraft(s, "user-a", "prompt-1", NOW), draft());
  });

  it("does not hand one user's draft to another", () => {
    const s = fakeStorage();
    writeDraft(s, draft({ userId: "user-a", content: "private" }));
    assert.equal(readDraft(s, "user-b", "prompt-1", NOW), null);
  });

  it("reports a full store instead of throwing", () => {
    // The case that is nearly impossible to trigger by hand and would otherwise
    // surface as an exception in the middle of someone typing.
    assert.deepEqual(writeDraft(fakeStorage("quota"), draft()), {
      ok: false,
      reason: "quota",
    });
  });

  it("reports a blocked store instead of throwing", () => {
    assert.deepEqual(writeDraft(fakeStorage("other"), draft()), {
      ok: false,
      reason: "unavailable",
    });
  });

  it("clears without complaint when there is nothing to clear", () => {
    const s = fakeStorage();
    assert.doesNotThrow(() => clearDraft(s, "user-a", "prompt-1"));
    writeDraft(s, draft());
    clearDraft(s, "user-a", "prompt-1");
    assert.equal(readDraft(s, "user-a", "prompt-1", NOW), null);
  });
});

describe("pruneDrafts", () => {
  it("removes expired drafts and leaves fresh ones", () => {
    const s = fakeStorage();
    writeDraft(s, draft({ promptId: "old", updatedAt: NOW - 30 * DAY }));
    writeDraft(s, draft({ promptId: "new", updatedAt: NOW - DAY }));
    assert.equal(pruneDrafts(s, "user-a", NOW), 1);
    assert.equal(readDraft(s, "user-a", "new", NOW)?.promptId, "new");
  });

  it("never touches another user's keys", () => {
    const s = fakeStorage();
    writeDraft(s, draft({ userId: "user-b", promptId: "theirs", updatedAt: NOW - 99 * DAY }));
    assert.equal(pruneDrafts(s, "user-a", NOW), 0);
    assert.equal(s.map.size, 1, "another account's draft was removed");
  });

  it("drops the oldest once one user has too many", () => {
    const s = fakeStorage();
    for (let i = 0; i < MAX_DRAFTS_PER_USER + 3; i++) {
      writeDraft(s, draft({ promptId: `p${i}`, updatedAt: NOW - i * 1000 }));
    }
    assert.equal(pruneDrafts(s, "user-a", NOW), 3);
    assert.equal(s.map.size, MAX_DRAFTS_PER_USER);
    // The three oldest are the ones with the largest offsets.
    assert.equal(readDraft(s, "user-a", "p0", NOW)?.promptId, "p0", "newest should survive");
  });

  it("sweeps up unparseable entries", () => {
    const s = fakeStorage();
    s.setItem(draftKey("user-a", "broken"), "{{{not json");
    assert.equal(pruneDrafts(s, "user-a", NOW), 1);
    assert.equal(s.map.size, 0);
  });
});
