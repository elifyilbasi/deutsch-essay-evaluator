import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { claimRateWindow, readLimitEnv, utcDay } from "@/lib/rateLimit";

/**
 * New accounts allowed per client IP per UTC day. Defaults rather than switching off
 * when unset: registration is the front door to a shared, metered API key, and the
 * per-user evaluation quota assumes accounts cost something to make. Without a throttle
 * they are free — one script, unlimited accounts, and the whole day's ceiling gone.
 *
 * Not a strong control. A proxy pool defeats it; a `for` loop does not, and that is the
 * difference worth buying until evaluations can be gated on a verified email address.
 */
function getRegistrationLimit(): number {
  return readLimitEnv(process.env.REGISTRATIONS_PER_IP_LIMIT) ?? 10;
}

/**
 * A stable per-IP key that is not the IP. Addresses are personal data and this table has
 * no business holding them; hashing with the app secret keeps the counter working while
 * making the stored value useless to anyone reading the database.
 */
function ipKey(request: Request): string {
  // Vercel sets x-forwarded-for; the left-most entry is the client. Absent locally, in
  // which case every request shares one bucket, which is the safe direction to fail.
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  const digest = createHash("sha256")
    .update(`${ip}:${process.env.AUTH_SECRET ?? ""}`)
    .digest("hex");
  return `register:${digest.slice(0, 32)}`;
}

/** Deliberately loose: the point is to reject obvious nonsense, not to police addresses. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const { name, email, password } = body as {
    name?: string;
    email?: string;
    password?: string;
  };

  const trimmedName = typeof name === "string" ? name.trim() : "";

  if (!trimmedName) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  if (typeof email !== "string" || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Email and a password of at least 8 characters are required." },
      { status: 400 },
    );
  }

  // Normalised before the uniqueness check and before the insert. The unique index is
  // case-sensitive, so without this one address is unlimited accounts — a@b.com,
  // A@b.com, a@B.com — each with its own daily evaluation quota.
  const normalisedEmail = email.trim().toLowerCase();

  if (!EMAIL_SHAPE.test(normalisedEmail)) {
    return NextResponse.json(
      { error: "That doesn't look like an email address." },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: normalisedEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  // Claimed after the duplicate check, so someone retrying with an address they already
  // registered does not spend their day's allowance on a request that creates nothing.
  const day = utcDay();
  const withinLimit = await claimRateWindow(ipKey(request), day, getRegistrationLimit());
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Too many accounts have been created from here today." },
      { status: 429 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name: trimmedName,
      email: normalisedEmail,
      passwordHash,
    },
  });

  // One row per address that has ever registered, so unlike the single-row API gate this
  // does accumulate. Swept here rather than by a cron: registrations are rare, the delete
  // is indexed, and a table that cleans itself needs no operational memory.
  //
  // Housekeeping, so it must never fail the request. The account exists by now; a 500
  // here would tell someone their registration failed when it did not, and they would
  // sensibly try again with the same address and be told it is taken.
  try {
    await prisma.rateWindow.deleteMany({
      where: { id: { startsWith: "register:" }, window: { lt: day } },
    });
  } catch (error) {
    console.error("Sweeping stale registration windows failed", error);
  }

  return NextResponse.json({ ok: true });
}
