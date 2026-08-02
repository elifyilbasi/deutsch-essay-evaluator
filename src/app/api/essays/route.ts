import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { countWords } from "@/lib/wordCount";
import { getRemainingEvaluationsToday } from "@/lib/rateLimit";
import { getRubric } from "@/lib/rubrics";
import { MAX_BODY_BYTES, checkEssayLength, exceedsBodyLimit } from "@/lib/essayLimits";
import { evaluateEssay } from "@/lib/gemini";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Sessions are JWTs, so a token stays valid after its user row is gone (deleted
  // account, reset database). Without this check the request sails through, spends a
  // Gemini call, and only fails at the insert with a foreign-key violation.
  const userExists = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!userExists) {
    return NextResponse.json(
      { error: "Your session is no longer valid. Please sign out and log in again." },
      { status: 401 },
    );
  }

  // Cheap gate first: App Router route handlers have no default body cap, so
  // `request.json()` on a huge body allocates before any validation runs.
  if (exceedsBodyLimit(request.headers.get("content-length"))) {
    return NextResponse.json({ error: "That submission is too large." }, { status: 413 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "That submission is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const { promptId, content, writingSeconds } = body as {
    promptId?: string;
    content?: string;
    writingSeconds?: number;
  };

  if (typeof promptId !== "string" || typeof content !== "string" || !content.trim()) {
    return NextResponse.json(
      { error: "A prompt and non-empty essay content are required." },
      { status: 400 },
    );
  }

  const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
  if (!prompt || !prompt.isActive) {
    return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
  }

  const rubric = getRubric(prompt.institute, prompt.level);
  if (!rubric) {
    return NextResponse.json(
      { error: "This institute/level combination is not supported yet." },
      { status: 400 },
    );
  }

  const wordCount = countWords(content);
  // Enforced here, not just in the browser: the textarea's maxLength is a courtesy,
  // this is what stops an oversized text reaching a paid model call.
  const tooLong = checkEssayLength(content, rubric, wordCount);
  if (tooLong) {
    return NextResponse.json({ error: tooLong }, { status: 400 });
  }

  const { remaining, limit } = await getRemainingEvaluationsToday(session.user.id);
  if (remaining <= 0) {
    return NextResponse.json(
      {
        error: `You've used all ${limit} of your evaluations for today. Please try again tomorrow.`,
      },
      { status: 429 },
    );
  }

  let evaluation;
  try {
    evaluation = await evaluateEssay({
      institute: prompt.institute,
      level: prompt.level,
      promptTitle: prompt.title,
      taskIntro: prompt.taskIntro,
      stimulusText: prompt.stimulusText,
      stimulusAuthor: prompt.stimulusAuthor,
      instructions: prompt.instructions,
      leitpunkte: prompt.leitpunkte,
      register: prompt.register,
      requiresSubject: prompt.requiresSubject,
      rubric,
      essay: content,
      wordCount,
    });
  } catch (error) {
    console.error("Gemini evaluation failed", error);
    return NextResponse.json(
      { error: "We couldn't evaluate your essay right now. Please try again shortly." },
      { status: 502 },
    );
  }

  let essay;
  try {
    essay = await prisma.essay.create({
      data: {
        userId: session.user.id,
        promptId: prompt.id,
        institute: prompt.institute,
        level: prompt.level,
        content,
        wordCount,
        writingSeconds:
          typeof writingSeconds === "number" && Number.isFinite(writingSeconds)
            ? Math.max(0, Math.round(writingSeconds))
            : null,
        status: "EVALUATED",
        evaluation: {
          create: {
            overallScore: evaluation.result.overallScore,
            maxScore: evaluation.result.maxScore,
            rawScore: evaluation.result.rawScore,
            zeroedReason: evaluation.result.zeroedReason,
            resultLabel: evaluation.result.resultLabel,
            criteriaScores: evaluation.result.criteriaScores,
            leitpunktCoverage: evaluation.result.leitpunktCoverage,
            corrections: evaluation.result.corrections,
            summaryFeedback: evaluation.result.summaryFeedback,
            rawModelResponse: evaluation.raw,
          },
        },
      },
      select: { id: true },
    });
  } catch (error) {
    // Always answer with JSON: an unhandled throw here yields a body-less 500, which
    // surfaces on the client as an opaque "Unexpected end of JSON input".
    console.error("Saving the evaluated essay failed", error);
    return NextResponse.json(
      { error: "Your essay was evaluated but couldn't be saved. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: essay.id }, { status: 201 });
}
