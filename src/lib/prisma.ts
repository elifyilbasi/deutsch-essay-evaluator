import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * One Prisma client per process, reused for the life of that process.
 *
 * Cached on globalThis unconditionally, where this used to skip the cache in production.
 * The old shape had the adapter — and so a pg Pool — constructed at module scope on every
 * evaluation, whether or not the client it belonged to was the one that got used. In dev
 * that meant an orphaned pool per HMR edit, connected to nothing and closed by nobody.
 * Building it inside the factory below fixes that, and caching everywhere costs nothing
 * on a server that only evaluates this once anyway.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Connections this process may hold.
 *
 * Deliberately small, because the number that matters is not this one. A serverless
 * deployment runs many instances at once and each gets its own pool, so the ceiling the
 * database actually sees is instances × this — and Postgres refuses connections long
 * before a Vercel deployment runs out of instances. Keeping the shared pooler
 * (Neon's `-pooler` host, PgBouncer, or equivalent) in the DATABASE_URL is what really
 * solves this; a small local pool is what stops one instance hoarding while it waits on
 * a slow Gemini call.
 *
 * A long-running single-process server is the opposite case — there, one pool serves
 * everything and a larger number is simply throughput. Raise it if this stops being
 * deployed to functions.
 */
const POOL_MAX = 5;

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: POOL_MAX,
    }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
