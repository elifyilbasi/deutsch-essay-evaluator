/**
 * Unsent essay drafts, kept in the browser so a refresh or a crash does not lose
 * work in progress.
 *
 * Every function here takes the storage it should use rather than reaching for
 * `window.localStorage`. That is the whole reason this module is separate from the
 * hook: the two failure modes worth getting right — storage blocked entirely, and
 * storage full — are painful to reproduce by hand and trivial to test against a fake.
 */

/** Bump when the stored shape changes: old entries are then dropped, not misread. */
const VERSION = 1;
const PREFIX = `dee:draft:v${VERSION}`;

/** Drafts older than this are treated as absent and swept up at mount. */
export const DRAFT_TTL_DAYS = 14;

/** Keeps one user's drafts from ballooning if they never submit any of them. */
export const MAX_DRAFTS_PER_USER = 20;

export type Draft = {
  v: number;
  userId: string;
  promptId: string;
  content: string;
  elapsedSeconds: number;
  /** Epoch milliseconds. */
  updatedAt: number;
};

/** Just the parts of the Storage API used here, so a test can supply a fake. */
export type StorageLike = {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type WriteResult = { ok: true } | { ok: false; reason: "quota" | "unavailable" };

/**
 * Scoped by user as well as task. Two accounts on one browser must not see each
 * other's unsent work, and the id is used rather than the email because an email is
 * personal data sitting in shared storage and is not stably cased.
 */
export function draftKey(userId: string, promptId: string): string {
  return `${PREFIX}:${userId}:${promptId}`;
}

export function serializeDraft(draft: Draft): string {
  return JSON.stringify(draft);
}

/**
 * Reads a stored blob back, rejecting anything that does not match the key it was
 * found under. A hand-edited or collided entry is discarded rather than trusted.
 */
export function parseDraft(
  raw: string | null,
  expected: { userId: string; promptId: string },
): Draft | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const d = value as Partial<Draft>;
  if (d.v !== VERSION) return null;
  if (typeof d.content !== "string") return null;
  if (typeof d.elapsedSeconds !== "number" || !Number.isFinite(d.elapsedSeconds)) return null;
  if (typeof d.updatedAt !== "number" || !Number.isFinite(d.updatedAt)) return null;
  if (d.userId !== expected.userId || d.promptId !== expected.promptId) return null;
  return {
    v: VERSION,
    userId: d.userId,
    promptId: d.promptId,
    content: d.content,
    elapsedSeconds: Math.max(0, Math.round(d.elapsedSeconds)),
    updatedAt: d.updatedAt,
  };
}

export function isExpired(updatedAt: number, now = Date.now()): boolean {
  return now - updatedAt > DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000;
}

export function readDraft(
  storage: StorageLike,
  userId: string,
  promptId: string,
  now = Date.now(),
): Draft | null {
  const key = draftKey(userId, promptId);
  const draft = parseDraft(storage.getItem(key), { userId, promptId });
  if (!draft) return null;
  if (isExpired(draft.updatedAt, now)) {
    storage.removeItem(key);
    return null;
  }
  return draft;
}

export function writeDraft(storage: StorageLike, draft: Draft): WriteResult {
  try {
    storage.setItem(draftKey(draft.userId, draft.promptId), serializeDraft(draft));
    return { ok: true };
  } catch (error) {
    // Safari in private mode has historically thrown on access; a full store throws
    // QuotaExceededError (code 22, or 1014 on older Firefox).
    const name = (error as { name?: string })?.name ?? "";
    const code = (error as { code?: number })?.code;
    const quota = name === "QuotaExceededError" || code === 22 || code === 1014;
    return { ok: false, reason: quota ? "quota" : "unavailable" };
  }
}

export function clearDraft(storage: StorageLike, userId: string, promptId: string): void {
  try {
    storage.removeItem(draftKey(userId, promptId));
  } catch {
    // Nothing to do: the draft is unreachable either way.
  }
}

/** Every key belonging to one user, oldest first. */
function userKeys(storage: StorageLike, userId: string): string[] {
  const prefix = `${PREFIX}:${userId}:`;
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.startsWith(prefix)) keys.push(key);
  }
  return keys;
}

/**
 * Drops this user's expired drafts, and the oldest of any excess. Deliberately scoped
 * to one user: another account's drafts may still be wanted, and we cannot know.
 * Returns how many were removed.
 */
export function pruneDrafts(storage: StorageLike, userId: string, now = Date.now()): number {
  // Keys are collected before anything is removed — removing during the scan shifts
  // the indices underneath it and silently skips entries.
  const entries = userKeys(storage, userId)
    .map((key) => {
      let updatedAt = 0;
      try {
        const parsed = JSON.parse(storage.getItem(key) ?? "null") as { updatedAt?: unknown };
        if (typeof parsed?.updatedAt === "number") updatedAt = parsed.updatedAt;
      } catch {
        // Unparseable: treat as ancient so it is swept up.
      }
      return { key, updatedAt };
    })
    .sort((a, b) => a.updatedAt - b.updatedAt);

  const doomed = new Set(
    entries.filter((e) => e.updatedAt === 0 || isExpired(e.updatedAt, now)).map((e) => e.key),
  );
  const surviving = entries.filter((e) => !doomed.has(e.key));
  for (const e of surviving.slice(0, Math.max(0, surviving.length - MAX_DRAFTS_PER_USER))) {
    doomed.add(e.key);
  }

  for (const key of doomed) {
    try {
      storage.removeItem(key);
    } catch {
      // Best effort; a store we cannot write to is one we cannot tidy either.
    }
  }
  return doomed.size;
}
