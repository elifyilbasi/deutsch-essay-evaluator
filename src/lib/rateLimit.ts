import { prisma } from "@/lib/prisma";

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getDailyEvalLimit(): number {
  const parsed = Number(process.env.DAILY_EVAL_LIMIT);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

export async function getRemainingEvaluationsToday(userId: string): Promise<{
  limit: number;
  used: number;
  remaining: number;
}> {
  const limit = getDailyEvalLimit();
  const used = await prisma.evaluation.count({
    where: {
      essay: { userId },
      createdAt: { gte: startOfUtcDay(new Date()) },
    },
  });

  return { limit, used, remaining: Math.max(0, limit - used) };
}
