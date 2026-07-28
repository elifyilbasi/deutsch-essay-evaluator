import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Institute, Level } from "@/generated/prisma/client";
import { getRubric } from "@/lib/rubrics";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const institute = searchParams.get("institute");
  const level = searchParams.get("level");

  if (
    !institute ||
    !level ||
    !(institute in Institute) ||
    !(level in Level)
  ) {
    return NextResponse.json(
      { error: "Query params 'institute' and 'level' are required and must be valid." },
      { status: 400 },
    );
  }

  const prompts = await prisma.prompt.findMany({
    where: { institute: institute as Institute, level: level as Level, isActive: true },
    select: {
      id: true,
      title: true,
      taskIntro: true,
      stimulusText: true,
      stimulusAuthor: true,
      instructions: true,
      leitpunkte: true,
      register: true,
      requiresSubject: true,
      minWords: true,
      maxWords: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // The exam time limit lives in the rubric (server-only), so attach it here for the client.
  const rubric = getRubric(institute as Institute, level as Level);

  // How often this user has attempted each task, and their best score on it.
  const attempts = await prisma.essay.findMany({
    where: {
      userId: session.user.id,
      promptId: { in: prompts.map((p) => p.id) },
      evaluation: { isNot: null },
    },
    select: {
      promptId: true,
      evaluation: { select: { overallScore: true, maxScore: true } },
    },
  });

  const practiceByPrompt = new Map<
    string,
    { attemptCount: number; bestScore: number; maxScore: number }
  >();
  for (const attempt of attempts) {
    if (!attempt.evaluation) continue;
    const current = practiceByPrompt.get(attempt.promptId);
    practiceByPrompt.set(attempt.promptId, {
      attemptCount: (current?.attemptCount ?? 0) + 1,
      bestScore: Math.max(current?.bestScore ?? 0, attempt.evaluation.overallScore),
      maxScore: attempt.evaluation.maxScore,
    });
  }

  const enriched = prompts.map((prompt) => ({
    ...prompt,
    timeLimitMinutes: rubric?.timeLimitMinutes ?? null,
    practice: practiceByPrompt.get(prompt.id) ?? null,
  }));

  return NextResponse.json({ prompts: enriched });
}
