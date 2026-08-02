import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { countWords } from "@/lib/wordCount";
import { releaseEvaluation, reserveEvaluation } from "@/lib/rateLimit";
import { getRubric } from "@/lib/rubrics";
import {
  MAX_BODY_BYTES,
  checkEssayLength,
  exceedsBodyLimit,
} from "@/lib/essayLimits";
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
      {
        error:
          "Your session is no longer valid. Please sign out and log in again.",
      },
      { status: 401 },
    );
  }

  // Cheap gate first: App Router route handlers have no default body cap, so
  // `request.json()` on a huge body allocates before any validation runs.
  if (exceedsBodyLimit(request.headers.get("content-length"))) {
    return NextResponse.json(
      { error: "That submission is too large." },
      { status: 413 },
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "That submission is too large." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Malformed request body." },
      { status: 400 },
    );
  }

  const { promptId, content, writingSeconds, submissionId } = body as {
    promptId?: string;
    content?: string;
    writingSeconds?: number;
    submissionId?: string;
  };

  if (
    typeof promptId !== "string" ||
    typeof content !== "string" ||
    !content.trim()
  ) {
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

  // A retry after an ambiguous timeout must not pay twice. The unique index on
  // submissionId is the real guard; this read is only the cheap path to it.
  if (typeof submissionId === "string" && submissionId) {
    const existing = await prisma.essay.findFirst({
      where: { submissionId, userId: session.user.id },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ id: existing.id }, { status: 200 });
    }
  }

  const reservation = await reserveEvaluation(session.user.id);
  if (!reservation.ok) {
    return NextResponse.json(
      {
        error:
          reservation.reason === "global"
            ? "The shared daily evaluation limit has been reached. Please try again tomorrow."
            : `You've used all ${reservation.limit} of your evaluations for today. Please try again tomorrow.`,
      },
      { status: 429 },
    );
  }

  // Written BEFORE the paid call, so a failure afterwards keeps the user's text
  // instead of discarding it with the response. SUBMITTED means exactly that:
  // charged for, not yet scored.
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
        status: "SUBMITTED",
        submissionId:
          typeof submissionId === "string" && submissionId
            ? submissionId
            : null,
      },
      select: { id: true },
    });
  } catch (error) {
    // A duplicate submissionId means a concurrent retry beat the read above. Hand the
    // slot back and return the essay that request created.
    const duplicate =
      typeof submissionId === "string" &&
      submissionId &&
      (await prisma.essay.findFirst({
        where: { submissionId, userId: session.user.id },
        select: { id: true },
      }));
    if (duplicate) {
      await releaseEvaluation(session.user.id);
      return NextResponse.json({ id: duplicate.id }, { status: 200 });
    }
    console.error("Saving the submitted essay failed", error);
    await releaseEvaluation(session.user.id);
    return NextResponse.json(
      { error: "We couldn't save your essay. Please try again." },
      { status: 500 },
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
    // The essay stays SUBMITTED and the reservation stands: a failed call still costs
    // the shared key, so refunding it would make induced failures free. The id goes
    // back so the client can point the user at their saved text.
    console.error("Gemini evaluation failed", error);
    return NextResponse.json(
      {
        error:
          "We couldn't evaluate your essay right now. Your text has been saved.",
        id: essay.id,
      },
      { status: 502 },
    );
  }

  // One transaction: the evaluation lands and the essay leaves SUBMITTED together, so
  // there is no state where a scored essay still looks unscored.
  try {
    await prisma.$transaction([
      prisma.evaluation.create({
        data: {
          essayId: essay.id,
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
      }),
      prisma.essay.update({
        where: { id: essay.id },
        data: { status: "EVALUATED" },
      }),
    ]);
  } catch (error) {
    // The paid response is about to be lost, and this log is its only durable trace.
    // The essay itself survives as SUBMITTED, so the user keeps their text.
    console.error("Saving the evaluation failed", {
      essayId: essay.id,
      raw: evaluation.raw,
      error,
    });
    return NextResponse.json(
      {
        error:
          "Your essay was evaluated but the result couldn't be saved. Your text is safe.",
        id: essay.id,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: essay.id }, { status: 201 });
}
