import { prisma } from "@/lib/prisma";

/**
 * Daily evaluation quota.
 *
 * Counted in a table of its own rather than derived from Essay or Evaluation rows.
 * Quota used to be `count(Evaluation)` for today, and both of those are deletable by
 * the user, so submit → read the result → delete the essay → submit again cost
 * nothing. On a shared free-tier key that is an availability hole, not just a cost
 * one: one person can exhaust the key for everybody.
 */

/** The UTC calendar day, as stored in DailyUsage.day. */
function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * A configured whole number, or null where the variable is absent or unusable.
 *
 * The emptiness check is the point. `Number("")` and `Number(" ")` are both `0`, not
 * NaN, so a variable that exists but was never filled in used to parse as a real
 * limit of zero — and zero means "refuse everything" for both of these settings. An
 * unfilled DAILY_EVAL_LIMIT switched the product off for every user, and the empty
 * GLOBAL_DAILY_EVAL_LIMIT shipped in .env.example made a fresh clone refuse its very
 * first submission. Absent and zero have to be different answers here.
 */
export function readLimitEnv(raw: string | undefined): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function getDailyEvalLimit(): number {
  // An explicit "0" is honoured — it is the documented way to switch evaluations off.
  // Anything unset or unparseable falls back to the default rather than to zero.
  return readLimitEnv(process.env.DAILY_EVAL_LIMIT) ?? 5;
}

/**
 * A ceiling across all users, checked before the per-user one. Per-user quota is
 * fairness; with open registration an abuser simply creates accounts, so this is what
 * actually protects the shared key. Unset means no ceiling.
 */
function getGlobalDailyLimit(): number | null {
  return readLimitEnv(process.env.GLOBAL_DAILY_EVAL_LIMIT);
}

export type UsageToday = { limit: number; used: number; remaining: number };

/** Read-only view for /api/quota and the write page. */
export async function getUsageToday(userId: string): Promise<UsageToday> {
  const limit = getDailyEvalLimit();
  const row = await prisma.dailyUsage.findUnique({
    where: { userId_day: { userId, day: utcDay() } },
    select: { used: true },
  });
  const used = row?.used ?? 0;
  return { limit, used, remaining: Math.max(0, limit - used) };
}

export type ReservationResult =
  | { ok: true }
  | { ok: false; reason: "user" | "global"; limit: number };

/**
 * Claims one evaluation for this user, or refuses. Call before the model call, never
 * after: a reservation that is only taken on success makes deliberately-induced
 * failures free.
 *
 * The claim is a single conditional UPDATE. Under Postgres read-committed a
 * concurrent writer blocks on the row lock and then re-evaluates the WHERE clause
 * against the *updated* row, so two requests cannot both take the last slot. That is
 * what closes the check-then-act race the old count-then-call code had, without
 * serializable isolation or a retry loop. It rests on a database semantic rather than
 * anything a unit test can show, so it is verified by a concurrent request check.
 */
export async function reserveEvaluation(userId: string): Promise<ReservationResult> {
  const day = utcDay();
  const limit = getDailyEvalLimit();

  const globalLimit = getGlobalDailyLimit();
  if (globalLimit !== null) {
    const total = await prisma.dailyUsage.aggregate({
      where: { day },
      _sum: { used: true },
    });
    if ((total._sum.used ?? 0) >= globalLimit) {
      return { ok: false, reason: "global", limit: globalLimit };
    }
  }

  if (limit === 0) {
    return { ok: false, reason: "user", limit };
  }

  // One statement that both creates today's row and conditionally increments it.
  // Raw because Prisma cannot express INSERT ... ON CONFLICT DO UPDATE ... WHERE, and
  // the alternatives are worse: creating the row up front makes every concurrent
  // request issue an insert that can only fail on the unique index, and claiming
  // first then reading to find out why costs a second round trip on exactly the path
  // that is already under contention.
  //
  // Atomicity comes from Postgres. The conflicting inserts serialise on the unique
  // index, and each then re-evaluates the WHERE against the committed row, so the
  // count can never pass the limit however many requests arrive together. Verified by
  // a concurrent-request check rather than a unit test, since it rests on a database
  // semantic no in-process test can demonstrate.
  const claimed = await prisma.$executeRaw`
    INSERT INTO "DailyUsage" ("userId", "day", "used", "updatedAt")
    VALUES (${userId}, ${day}, 1, NOW())
    ON CONFLICT ("userId", "day")
    DO UPDATE SET "used" = "DailyUsage"."used" + 1, "updatedAt" = NOW()
    WHERE "DailyUsage"."used" < ${limit}
  `;

  return claimed === 1 ? { ok: true } : { ok: false, reason: "user", limit };
}

/**
 * Hands a reservation back. Used only where a request turns out to be a duplicate of
 * one already paid for — deliberately NOT on evaluation failure, since a failed call
 * still costs the shared key.
 */
export async function releaseEvaluation(userId: string): Promise<void> {
  await prisma.dailyUsage.updateMany({
    where: { userId, day: utcDay(), used: { gt: 0 } },
    data: { used: { decrement: 1 } },
  });
}
