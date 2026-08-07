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
import {
  evaluateEssay,
  isOverloadedError,
  isQuotaError,
  upstreamFailureMessage,
} from "@/lib/gemini";

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
    // Different cures, so different messages: wait a minute, wait a day, wait until
    // the account is a day old, or you have simply used your own five.
    const message = {
      burst: "Too many essays are being evaluated right now. Please try again in a minute.",
      global:
        "The shared daily evaluation limit has been reached. Please try again tomorrow.",
      newcomer:
        "New accounts share a small part of each day's evaluations, and today's part is used up. Your account draws from the full pool once it is a day old.",
      user: `You've used all ${reservation.limit} of your evaluations for today. Please try again tomorrow.`,
    }[reservation.reason];

    return NextResponse.json({ error: message }, { status: 429 });
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
    console.error("Gemini evaluation failed", error);

    // The one failure that is refunded. The no-refund rule exists because a failed call
    // still costs the shared key — which is exactly what a call refused at Google's
    // quota gate did not do, since it never reached the model. Charging for it would
    // bill the user for our own rate limits being too generous.
    if (isQuotaError(error)) {
      await releaseEvaluation(session.user.id);
      return NextResponse.json(
        // Wording comes from the quota Google actually named. This used to promise "a few
        // minutes" for every 429, including the per-day allowance that does not clear for
        // hours — sending the learner into a retry loop that could not succeed.
        { error: upstreamFailureMessage(error), id: essay.id },
        { status: 429 },
      );
    }

    // Refunded for the same reason: the model was too busy to take the call, so it never
    // reached one and cost the shared key nothing. Charging a learner a day's slot for
    // Google's capacity is the same unfairness as charging them for our own rate limits.
    // This is what is left after the retries in evaluateEssay have already been spent.
    if (isOverloadedError(error)) {
      await releaseEvaluation(session.user.id);
      return NextResponse.json(
        { error: upstreamFailureMessage(error), id: essay.id },
        { status: 503 },
      );
    }

    // Otherwise the essay stays SUBMITTED and the reservation stands. The id goes back
    // so the client can point the user at their saved text.
    return NextResponse.json(
      {
        error:
          "We couldn't evaluate your essay right now. Your text has been saved.",
        id: essay.id,
      },
      { status: 502 },
    );
  }

  // Only the evaluation is written. "Evaluated" is not a second fact to store on the
  // essay - it is whether this row exists. Storing it twice is what let an essay claim
  // EVALUATED while its evaluation was gone.
  try {
    await prisma.evaluation.create({
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
    });
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
