import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { claimRateWindow, reserveEvaluation, utcMinute } from "@/lib/rateLimit";

/** RateWindow.id the reservation path uses for the shared Gemini rate gate. */
const GATE_ID = "gemini";

/**
 * What the unit tests cannot show.
 *
 * Both quota claims in `src/lib/rateLimit.ts` rest on database semantics — a row lock
 * re-evaluating a WHERE clause, and an advisory lock serialising the day's
 * reservations. Neither is visible to an in-process test, and `npm test` deliberately
 * runs without a database, so this check lives outside the suite:
 *
 *   npm run check:concurrency
 *
 * It fires real concurrent reservations at the configured DATABASE_URL and asserts the
 * committed totals land exactly on the limit, never past it. Run it against a
 * development database: it creates throwaway users of its own and deletes them again,
 * but it does count against today's real usage rows while it runs.
 */

const CONCURRENCY = 8;
/** Free slots left under the ceiling. Fewer than CONCURRENCY, so the ceiling bites. */
const HEADROOM = 3;

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

async function totalUsedToday(): Promise<number> {
  const total = await prisma.dailyUsage.aggregate({
    where: { day: utcDay() },
    _sum: { used: true },
  });
  return total._sum.used ?? 0;
}

async function createUsers(count: number, registeredDaysAgo = 0): Promise<string[]> {
  const createdAt = new Date(Date.now() - registeredDaysAgo * 24 * 60 * 60 * 1000);
  const users = await Promise.all(
    Array.from({ length: count }, () =>
      prisma.user.create({
        // .invalid is reserved by RFC 2606, so these can never collide with a real
        // account or be mistaken for one.
        data: { email: `concurrency-check+${randomUUID()}@example.invalid`, createdAt },
        select: { id: true },
      }),
    ),
  );
  return users.map((user) => user.id);
}

/** Today's usage that belongs to accounts the new-account allowance applies to. */
async function newAccountUsedToday(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await prisma.$queryRaw<{ used: number }[]>`
    SELECT COALESCE(SUM(du."used"), 0)::int AS "used"
    FROM "DailyUsage" du
    JOIN "User" u ON u."id" = du."userId"
    WHERE du."day" = ${utcDay()} AND u."createdAt" > ${cutoff}
  `;
  return row?.used ?? 0;
}

/**
 * The three limits, set explicitly for every case. Without this each check would
 * inherit whatever `.env` happens to configure, and a case would quietly start
 * measuring a limit it did not mean to.
 */
function configure(limits: {
  user: number;
  global?: number;
  rpm?: number;
  newAccounts?: number;
  firstDay?: number;
}): void {
  process.env.DAILY_EVAL_LIMIT = String(limits.user);

  if (limits.global === undefined) {
    delete process.env.GLOBAL_DAILY_EVAL_LIMIT;
  } else {
    process.env.GLOBAL_DAILY_EVAL_LIMIT = String(limits.global);
  }

  if (limits.rpm === undefined) {
    delete process.env.GEMINI_RPM_LIMIT;
  } else {
    process.env.GEMINI_RPM_LIMIT = String(limits.rpm);
  }

  if (limits.newAccounts === undefined) {
    delete process.env.NEW_ACCOUNT_DAILY_LIMIT;
  } else {
    process.env.NEW_ACCOUNT_DAILY_LIMIT = String(limits.newAccounts);
  }

  if (limits.firstDay === undefined) {
    delete process.env.FIRST_DAY_EVAL_LIMIT;
  } else {
    process.env.FIRST_DAY_EVAL_LIMIT = String(limits.firstDay);
  }
}

let failures = 0;

function check(label: string, actual: number, expected: number): void {
  if (actual === expected) {
    console.log(`  ok    ${label}: ${actual}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${label}: ${actual}, expected ${expected}`);
  }
}

/**
 * The ceiling is a SUM over every user's row, so there is no single row for concurrent
 * writers to serialise on — which is why it needs the advisory lock. Without it, all
 * CONCURRENCY requests read the same under-limit total and all claim.
 */
async function checkGlobalCeiling(): Promise<void> {
  console.log(`\nGlobal ceiling, ${CONCURRENCY} users racing for ${HEADROOM} slots`);
  const userIds = await createUsers(CONCURRENCY);
  try {
    // Relative to what is already there: this runs against a database with real rows.
    const before = await totalUsedToday();
    configure({ user: 1, global: before + HEADROOM });

    const results = await Promise.all(userIds.map((id) => reserveEvaluation(id)));

    check("reservations granted", results.filter((r) => r.ok).length, HEADROOM);
    check("evaluations charged", (await totalUsedToday()) - before, HEADROOM);
    check(
      "refusals blaming the ceiling",
      results.filter((r) => !r.ok && r.reason === "global").length,
      CONCURRENCY - HEADROOM,
    );
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

/**
 * The per-user claim has always been a single conditional UPDATE. This is the
 * regression guard for it, and the control case: it must pass with or without a
 * ceiling configured.
 */
async function checkPerUserLimit(): Promise<void> {
  const limit = 2;
  console.log(`\nPer-user limit, ${CONCURRENCY} requests from one user for ${limit} slots`);
  const [userId] = await createUsers(1);
  try {
    configure({ user: limit });

    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () => reserveEvaluation(userId)),
    );

    check("reservations granted", results.filter((r) => r.ok).length, limit);
    const row = await prisma.dailyUsage.findUnique({
      where: { userId_day: { userId, day: utcDay() } },
      select: { used: true },
    });
    check("evaluations charged", row?.used ?? 0, limit);
  } finally {
    await prisma.user.deleteMany({ where: { id: userId } });
  }
}

const HEADROOM_PER_MINUTE = 2;
/** A limit no run will reach. Not MAX_SAFE_INTEGER: RateWindow.used is an int4 column. */
const EFFECTIVELY_UNLIMITED = 1_000_000;

/**
 * The gate is one row reused across minutes, so the limit is set relative to whatever
 * the current minute has already spent — otherwise two runs inside the same minute
 * would measure the second one against a budget the first had used up.
 */
async function checkRateGate(): Promise<void> {
  console.log(
    `\nRate gate, ${CONCURRENCY} requests in one minute for ${HEADROOM_PER_MINUTE} calls`,
  );
  const userIds = await createUsers(CONCURRENCY);
  try {
    // One claim up front so the row exists, which makes the row count below a
    // measurement of reuse rather than of creation.
    const minute = utcMinute();
    await claimRateWindow(GATE_ID, minute, EFFECTIVELY_UNLIMITED);
    const gateBefore = await prisma.rateWindow.findUnique({ where: { id: GATE_ID } });
    const spent = gateBefore?.window === minute ? gateBefore.used : 0;

    configure({ user: 1, rpm: spent + HEADROOM_PER_MINUTE });

    const usageBefore = await totalUsedToday();
    const rowsBefore = await prisma.rateWindow.count();
    const results = await Promise.all(userIds.map((id) => reserveEvaluation(id)));

    check(
      "reservations granted",
      results.filter((r) => r.ok).length,
      HEADROOM_PER_MINUTE,
    );
    check(
      "evaluations charged",
      (await totalUsedToday()) - usageBefore,
      HEADROOM_PER_MINUTE,
    );
    check(
      "refusals blaming the burst",
      results.filter((r) => !r.ok && r.reason === "burst").length,
      CONCURRENCY - HEADROOM_PER_MINUTE,
    );
    // The whole point of the CASE in the claim: the row is reused, so a busy minute
    // adds no rows and nothing ever needs pruning.
    check("rows added by the burst", (await prisma.rateWindow.count()) - rowsBefore, 0);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

/** A claim in a later window must reset the count, not find it exhausted. */
async function checkWindowRollover(): Promise<void> {
  console.log("\nWindow rollover");
  const minute = utcMinute();
  const nextMinute = utcMinute(new Date(Date.parse(`${minute}:00Z`) + 60_000));
  try {
    // Fill the current minute right up, then claim in the next one.
    await claimRateWindow(GATE_ID, minute, EFFECTIVELY_UNLIMITED);
    const filled = await prisma.rateWindow.findUnique({ where: { id: GATE_ID } });
    check(
      "a full window refuses",
      (await claimRateWindow(GATE_ID, minute, filled?.used ?? 0)) ? 1 : 0,
      0,
    );
    check(
      "the next window allows",
      (await claimRateWindow(GATE_ID, nextMinute, 1)) ? 1 : 0,
      1,
    );
    const rolled = await prisma.rateWindow.findUnique({ where: { id: GATE_ID } });
    check("count after rollover", rolled?.used ?? 0, 1);
  } finally {
    // Leave the row describing the real current minute, not the future one this case
    // wrote, so a submission right after the check is not measured against a window
    // that has not happened yet.
    await prisma.rateWindow.deleteMany({ where: { id: GATE_ID } });
  }
}

/**
 * The reason a refusal throws instead of returning: a request turned away by a later
 * limit must not leave the earlier counters incremented. Otherwise a burst of requests
 * that are all out of personal quota would quietly spend the shared minute.
 */
async function checkRefusalLeavesNoTrace(): Promise<void> {
  console.log("\nRefusal leaves no trace");
  const [userId] = await createUsers(1);
  try {
    // A user limit of 0 refuses every request, and it refuses them *after* the rate
    // gate and the ceiling have been claimed inside the transaction.
    configure({ user: 0, global: 1000, rpm: 10 });

    const gateBefore = await prisma.rateWindow.findUnique({ where: { id: "gemini" } });
    const usageBefore = await totalUsedToday();

    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () => reserveEvaluation(userId)),
    );

    check("reservations granted", results.filter((r) => r.ok).length, 0);
    check("evaluations charged", (await totalUsedToday()) - usageBefore, 0);
    const gateAfter = await prisma.rateWindow.findUnique({ where: { id: "gemini" } });
    check(
      "rate gate consumed",
      (gateAfter?.used ?? 0) - (gateBefore?.used ?? 0),
      0,
    );
  } finally {
    delete process.env.GEMINI_RPM_LIMIT;
    delete process.env.GLOBAL_DAILY_EVAL_LIMIT;
    await prisma.user.deleteMany({ where: { id: userId } });
  }
}

/**
 * Belt and braces for the case cleanups: a case that fails partway through creating its
 * users never reaches its own `finally`, and a leaked user is a leaked DailyUsage row
 * that quietly shifts the next run's totals.
 */
async function sweepCheckUsers(): Promise<void> {
  await prisma.user.deleteMany({
    where: { email: { startsWith: "concurrency-check+" } },
  });
}

/**
 * The answer to account farming: however many accounts are minted, they are all new, so
 * they share one allowance. The second half is what makes it a share rather than a ban —
 * an account that has been here a day is not restricted by it.
 */
async function checkNewAccountShare(): Promise<void> {
  const headroom = 2;
  console.log(`\nNew-account share, ${CONCURRENCY} fresh accounts for ${headroom} slots`);
  const fresh = await createUsers(CONCURRENCY);
  const established = await createUsers(1, 3);
  try {
    // Relative to today's existing new-account usage, for the same reason the ceiling
    // case is relative: this runs against a database with real rows in it.
    const before = await newAccountUsedToday();
    configure({ user: 1, newAccounts: before + headroom });

    const results = await Promise.all(fresh.map((id) => reserveEvaluation(id)));

    check("reservations granted", results.filter((r) => r.ok).length, headroom);
    check("new-account evaluations charged", (await newAccountUsedToday()) - before, headroom);
    check(
      "refusals blaming the newcomer share",
      results.filter((r) => !r.ok && r.reason === "newcomer").length,
      CONCURRENCY - headroom,
    );

    // The allowance is spent, so a new account is refused — and an account registered
    // three days ago sails past it.
    const alsoNew = await reserveEvaluation((await createUsers(1))[0]);
    check("another new account", alsoNew.ok ? 1 : 0, 0);
    const older = await reserveEvaluation(established[0]);
    check("an established account", older.ok ? 1 : 0, 1);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: [...fresh, ...established] } } });
  }
}

/**
 * The allowance is a protection, not a tax: while the day is quiet there is nothing to
 * protect, so a newcomer whose pool is already spent still gets through. Once the day
 * passes the pressure line, the same request is refused.
 */
async function checkCeilingPressure(): Promise<void> {
  console.log("\nPressure line");
  const fresh = await createUsers(3);
  try {
    const before = await totalUsedToday();
    // Pressure at half the ceiling, so the line sits two evaluations above where the
    // day currently stands. The pool is set to what has already been spent, i.e. empty.
    configure({
      user: 1,
      global: (before + 2) * 2,
      newAccounts: await newAccountUsedToday(),
    });

    // Sequential, because each grant moves the day one step closer to the line.
    const first = await reserveEvaluation(fresh[0]);
    const second = await reserveEvaluation(fresh[1]);
    const third = await reserveEvaluation(fresh[2]);

    check("below the line, empty pool", first.ok && second.ok ? 1 : 0, 1);
    check("at the line, empty pool", third.ok ? 1 : 0, 0);
    check(
      "and the refusal names the newcomer pool",
      !third.ok && third.reason === "newcomer" ? 1 : 0,
      1,
    );
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: fresh } } });
  }
}

/** A new account gets its first-day quota; an established one gets the ordinary quota. */
async function checkFirstDayQuota(): Promise<void> {
  const daily = 5;
  const firstDay = 2;
  console.log(`\nFirst-day quota, ${firstDay} of the usual ${daily}`);
  const [newcomer] = await createUsers(1);
  const [established] = await createUsers(1, 3);
  try {
    configure({ user: daily, firstDay });

    const forNewcomer = await Promise.all(
      Array.from({ length: CONCURRENCY }, () => reserveEvaluation(newcomer)),
    );
    const forEstablished = await Promise.all(
      Array.from({ length: CONCURRENCY }, () => reserveEvaluation(established)),
    );

    check("granted to a new account", forNewcomer.filter((r) => r.ok).length, firstDay);
    check(
      "granted to an established account",
      forEstablished.filter((r) => r.ok).length,
      daily,
    );
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: [newcomer, established] } } });
  }
}

async function main(): Promise<void> {
  console.log(`Concurrent reservation check against ${utcDay()} (UTC)`);
  try {
    await sweepCheckUsers();
    await checkGlobalCeiling();
    await checkPerUserLimit();
    await checkRateGate();
    await checkWindowRollover();
    await checkNewAccountShare();
    await checkCeilingPressure();
    await checkFirstDayQuota();
    await checkRefusalLeavesNoTrace();
  } finally {
    await sweepCheckUsers();
    await prisma.$disconnect();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
