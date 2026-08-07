import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Institute, Level } from "@/generated/prisma/client";
import { getRubric } from "@/lib/rubrics";
import { parseEnumValue } from "@/lib/parseEnum";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const institute = parseEnumValue(Institute, searchParams.get("institute"));
  const level = parseEnumValue(Level, searchParams.get("level"));

  if (!institute || !level) {
    return NextResponse.json(
      { error: "Query params 'institute' and 'level' are required and must be valid." },
      { status: 400 },
    );
  }

  const prompts = await prisma.prompt.findMany({
    where: { institute, level, isActive: true },
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
  const rubric = getRubric(institute, level);

  // Likewise how many Leitpunkte the level actually marks, which is not always how many
  // the task prints: telc B2 prints four and asks for three, one of which may be an
  // aspect of the candidate's own. Null where the level marks every point it prints.
  const requiredPoints = rubric?.selfChosenAspects?.expectedTotal ?? null;

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
  // Best attempt by ratio, carrying that attempt's OWN maximum. Taking Math.max over
  // scores and then tacking on whichever maxScore happened to be iterated last could
  // display one attempt's score against another's denominator - "9 / 7" - and each
  // Evaluation stores its own maximum precisely so historical rows survive rubric
  // changes (see prisma/schema.prisma).
  for (const attempt of attempts) {
    if (!attempt.evaluation) continue;
    const { overallScore, maxScore } = attempt.evaluation;
    const current = practiceByPrompt.get(attempt.promptId);
    const isBest =
      !current || overallScore / maxScore > current.bestScore / current.maxScore;
    practiceByPrompt.set(attempt.promptId, {
      attemptCount: (current?.attemptCount ?? 0) + 1,
      bestScore: isBest ? overallScore : current.bestScore,
      maxScore: isBest ? maxScore : current.maxScore,
    });
  }

  const enriched = prompts.map((prompt) => ({
    ...prompt,
    timeLimitMinutes: rubric?.timeLimitMinutes ?? null,
    requiredPoints,
    practice: practiceByPrompt.get(prompt.id) ?? null,
  }));

  return NextResponse.json({ prompts: enriched });
}
