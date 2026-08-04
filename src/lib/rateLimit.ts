import type { Prisma } from "@/generated/prisma/client";
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
export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** The UTC minute, as stored in RateWindow.window for the API rate gate. */
export function utcMinute(now = new Date()): string {
  return now.toISOString().slice(0, 16);
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

/**
 * How long an account counts as new. Not configurable: the number wants to be long
 * enough that minting accounts is not a same-session tactic, and short enough that a
 * real person who signs up today is a full member by tomorrow.
 */
const NEW_ACCOUNT_HOURS = 24;

/** The moment an account must have been created after to still count as new. */
function newAccountCutoff(now = new Date()): Date {
  return new Date(now.getTime() - NEW_ACCOUNT_HOURS * 60 * 60 * 1000);
}

/**
 * Evaluations per UTC day shared by *every* account younger than NEW_ACCOUNT_HOURS.
 *
 * The per-user quota assumes accounts cost something to make; with open registration
 * they do not, so an abuser does not spend their own five, they mint accounts and spend
 * everybody's. Registration throttling raises the price of that; this bounds the payoff.
 * A farmed account is always a new account, so however many are created they draw from
 * this one allowance and the rest of the ceiling stays for people who were here
 * yesterday.
 *
 * It is deliberately not a fraction of the global ceiling: a plain number is easier to
 * reason about, and it still works when no ceiling is configured. Unset means new
 * accounts are not restricted; "0" means they cannot evaluate at all until they age in.
 *
 * What it does not stop: patience. An abuser who registers today and waits a day has
 * established accounts tomorrow. That is inherent to any age-based rule — the point is
 * that farming stops paying off within a session, not that it becomes impossible.
 */
function getNewAccountDailyLimit(): number | null {
  return readLimitEnv(process.env.NEW_ACCOUNT_DAILY_LIMIT);
}

/**
 * A new account's own daily quota, replacing DAILY_EVAL_LIMIT while it is new.
 *
 * The shared allowance above is first-come-first-served, so without this a handful of
 * accounts drink all of it: at five each, four accounts empty a pool of twenty before
 * anyone in another timezone wakes up. Capping the individual spreads the same pool
 * across more people *and* raises what farming costs, since draining it now takes ten
 * accounts rather than four. Unset means new accounts use the ordinary daily quota.
 */
function getFirstDayEvalLimit(): number | null {
  return readLimitEnv(process.env.FIRST_DAY_EVAL_LIMIT);
}

/**
 * How busy the day must be before the new-account allowance is enforced, as a percentage
 * of the global ceiling.
 *
 * Refusing a newcomer while nine tenths of the day's capacity sits unused protects
 * nothing — it just wastes the quota and turns away a real person. So the allowance only
 * bites once the day is genuinely contended, which is exactly when established users
 * need protecting from a flood of fresh accounts. Below the line, newcomers are limited
 * only by their own quota and the ceiling itself.
 *
 * With no ceiling configured there is no sense of "busy", so the allowance always
 * applies — the conservative reading of an unknown.
 */
const CEILING_PRESSURE_PERCENT = 50;

/**
 * Gemini calls allowed per minute across all users. The daily ceiling bounds the total;
 * this bounds the burst, which is what free-tier per-minute quotas actually refuse.
 * Unset means no rate gate.
 */
function getRpmLimit(): number | null {
  return readLimitEnv(process.env.GEMINI_RPM_LIMIT);
}

/** RateWindow.id for the shared Gemini rate gate. */
const RATE_GATE_ID = "gemini";

/**
 * Claims one unit against a named counter for one window, or refuses.
 *
 * A single conditional upsert, so it needs no lock of its own: concurrent writers
 * serialise on the row and re-evaluate the WHERE against the updated row, exactly as
 * `claimUserSlot` does. The CASE is what makes the row reusable — a claim arriving in a
 * new window overwrites the stale one and starts counting at 1, so this is one row
 * forever rather than a table that grows a row per minute.
 */
export async function claimRateWindow(
  id: string,
  window: string,
  limit: number,
  db: Prisma.TransactionClient = prisma,
): Promise<boolean> {
  if (limit === 0) {
    return false;
  }

  const claimed = await db.$executeRaw`
    INSERT INTO "RateWindow" ("id", "window", "used", "updatedAt")
    VALUES (${id}, ${window}, 1, NOW())
    ON CONFLICT ("id")
    DO UPDATE SET
      "window" = ${window},
      "used" = CASE
        WHEN "RateWindow"."window" = ${window} THEN "RateWindow"."used" + 1
        ELSE 1
      END,
      "updatedAt" = NOW()
    WHERE "RateWindow"."window" <> ${window} OR "RateWindow"."used" < ${limit}
  `;

  return claimed === 1;
}

/**
 * Advisory-lock key for one day's reservations. Advisory locks share a single
 * namespace across the database, so the key is a base of this app's own plus the day
 * index — which also keeps two adjacent UTC days from queueing behind each other
 * across the midnight boundary.
 */
const RESERVATION_LOCK_BASE = 0x6465_0000;

function reservationLockKey(day: string): bigint {
  const dayIndex = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  return BigInt(RESERVATION_LOCK_BASE + dayIndex);
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
  | { ok: false; reason: "user" | "global" | "burst" | "newcomer"; limit: number };

/**
 * Claims one slot against this user's own quota, or refuses.
 *
 * The claim is a single conditional UPDATE. Under Postgres read-committed a
 * concurrent writer blocks on the row lock and then re-evaluates the WHERE clause
 * against the *updated* row, so two requests cannot both take the last slot. That is
 * what closes the check-then-act race the old count-then-call code had, without
 * serializable isolation or a retry loop.
 */
async function claimUserSlot(
  db: Prisma.TransactionClient,
  userId: string,
  day: string,
  limit: number,
): Promise<ReservationResult> {
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
  const claimed = await db.$executeRaw`
    INSERT INTO "DailyUsage" ("userId", "day", "used", "updatedAt")
    VALUES (${userId}, ${day}, 1, NOW())
    ON CONFLICT ("userId", "day")
    DO UPDATE SET "used" = "DailyUsage"."used" + 1, "updatedAt" = NOW()
    WHERE "DailyUsage"."used" < ${limit}
  `;

  return claimed === 1 ? { ok: true } : { ok: false, reason: "user", limit };
}

/**
 * How old the account is, and what its own daily quota is as a result. One lookup,
 * because both the first-day quota and the shared new-account allowance need the same
 * answer, and it is a primary-key read on a path that is already doing several.
 */
async function resolveAccount(
  db: Prisma.TransactionClient,
  userId: string,
): Promise<{ isNew: boolean; limit: number }> {
  const dailyLimit = getDailyEvalLimit();
  const firstDayLimit = getFirstDayEvalLimit();

  // Nobody asked about account age, so do not go and ask the database.
  if (firstDayLimit === null && getNewAccountDailyLimit() === null) {
    return { isNew: false, limit: dailyLimit };
  }

  const account = await db.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  const isNew = account ? account.createdAt > newAccountCutoff() : false;

  return {
    isNew,
    // Never *raises* the quota: a first-day limit above the daily one would be a
    // configuration mistake reading as a promotion.
    limit: isNew && firstDayLimit !== null ? Math.min(dailyLimit, firstDayLimit) : dailyLimit,
  };
}

/**
 * Thrown to roll the reservation transaction back, and caught immediately outside it.
 * Never escapes this module: a refusal is a return value, not an error.
 */
class ReservationRefused extends Error {
  constructor(readonly result: ReservationResult) {
    super("reservation refused");
  }
}

/**
 * Claims one evaluation, or refuses. Call before the model call, never after: a
 * reservation that is only taken on success makes deliberately-induced failures free.
 *
 * Four limits, claimed cheapest and most protective first — the minute, then the day
 * across all users, then the day across accounts too new to be trusted, then this
 * user's own quota (which is itself smaller while the account is new). A refusal at any
 * step throws, which rolls back whatever the earlier steps claimed; a request refused
 * for its own quota must not leave a minute of shared capacity spent on nothing.
 *
 * The new-account allowance is enforced only once the day is contended. Turning a real
 * newcomer away while most of the ceiling sits unused protects nobody — it wastes the
 * quota and loses the person.
 *
 * They cannot all be claimed the same way. A user's count and the minute counter each
 * live in one row, so a conditional UPDATE serialises on that row's lock. The daily
 * ceiling is a SUM across *every* user's row, and read-committed hides the uncommitted
 * increments of concurrent requests however the aggregate is written — including as a
 * subquery inside the claim itself. There is no row for them to queue on, so reading
 * the total and then claiming is a check-then-act race: N requests arriving together
 * all read the same under-limit total and all claim, overshooting the ceiling by up to
 * N calls on the shared key. Hence the advisory lock, taken only when a ceiling is
 * configured and released when the transaction ends either way.
 *
 * The rate gate happens to hold its row's lock for the rest of the transaction, which
 * serialises the ceiling too — but only while GEMINI_RPM_LIMIT is set, so the advisory
 * lock stays rather than resting on an optional setting. Both rest on database
 * semantics no in-process test can show, so they are verified by
 * `npm run check:concurrency`.
 */
export async function reserveEvaluation(userId: string): Promise<ReservationResult> {
  const day = utcDay();
  const globalLimit = getGlobalDailyLimit();
  const rpmLimit = getRpmLimit();
  const newAccountLimit = getNewAccountDailyLimit();

  // Nothing shared to protect, so nothing to serialise: the user's own claim is already
  // atomic on its own row.
  if (globalLimit === null && rpmLimit === null && newAccountLimit === null) {
    const { limit } = await resolveAccount(prisma, userId);
    return claimUserSlot(prisma, userId, day, limit);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (rpmLimit !== null) {
        const claimed = await claimRateWindow(
          RATE_GATE_ID,
          utcMinute(),
          rpmLimit,
          tx,
        );
        if (!claimed) {
          throw new ReservationRefused({
            ok: false,
            reason: "burst",
            limit: rpmLimit,
          });
        }
      }

      // Both remaining limits are sums across rows other requests are writing, so both
      // need the lock. Taken once, before either.
      if (globalLimit !== null || newAccountLimit !== null) {
        // $executeRaw, not $queryRaw: the function returns void, which the driver
        // adapter has no type mapping for, and the row is of no interest anyway.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${reservationLockKey(day)})`;
      }

      let usedToday: number | null = null;

      if (globalLimit !== null) {
        const total = await tx.dailyUsage.aggregate({
          where: { day },
          _sum: { used: true },
        });
        usedToday = total._sum.used ?? 0;

        if (usedToday >= globalLimit) {
          throw new ReservationRefused({
            ok: false,
            reason: "global",
            limit: globalLimit,
          });
        }
      }

      const { isNew, limit } = await resolveAccount(tx, userId);

      // Only new accounts on a contended day pay for the aggregate below.
      const dayIsContended =
        globalLimit === null ||
        (usedToday ?? 0) >= Math.floor((globalLimit * CEILING_PRESSURE_PERCENT) / 100);

      if (newAccountLimit !== null && isNew && dayIsContended) {
        const cutoff = newAccountCutoff();
        // A join, so not expressible as a Prisma aggregate. The ::int matters: SUM
        // over an integer column is bigint, which arrives as a BigInt and compares
        // false against a number.
        const [spent] = await tx.$queryRaw<{ used: number }[]>`
          SELECT COALESCE(SUM(du."used"), 0)::int AS "used"
          FROM "DailyUsage" du
          JOIN "User" u ON u."id" = du."userId"
          WHERE du."day" = ${day} AND u."createdAt" > ${cutoff}
        `;

        if ((spent?.used ?? 0) >= newAccountLimit) {
          throw new ReservationRefused({
            ok: false,
            reason: "newcomer",
            limit: newAccountLimit,
          });
        }
      }

      const claim = await claimUserSlot(tx, userId, day, limit);
      if (!claim.ok) {
        throw new ReservationRefused(claim);
      }
      return claim;
    });
  } catch (error) {
    if (error instanceof ReservationRefused) {
      return error.result;
    }
    throw error;
  }
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
