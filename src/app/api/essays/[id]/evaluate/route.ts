import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { releaseEvaluation, reserveEvaluation } from "@/lib/rateLimit";
import { getRubric } from "@/lib/rubrics";
import {
  evaluateEssay,
  isOverloadedError,
  isQuotaError,
  upstreamFailureMessage,
} from "@/lib/gemini";

/**
 * Scores an essay that was saved but never evaluated.
 *
 * Submission writes the essay before the paid call, so that a failure afterwards keeps
 * the learner's text. What it did not have was a way back: an essay left SUBMITTED with
 * no Evaluation could never be scored, by any route in the app, and the results page said
 * "hasn't been evaluated yet" for good. One transient 503 from Google was enough to
 * strand a text permanently.
 *
 * Deliberately NOT a general re-evaluation. It refuses an essay that already has a
 * verdict, because re-running one is a different feature with a different cost question:
 * this is only the missing half of a submission that was already paid for.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const essay = await prisma.essay.findUnique({
    where: { id },
    include: { prompt: true, evaluation: { select: { id: true } } },
  });

  // One 404 for both "no such essay" and "not yours": a different message would let
  // anyone probe which ids exist.
  if (!essay || essay.userId !== session.user.id) {
    return NextResponse.json({ error: "Essay not found." }, { status: 404 });
  }

  if (essay.evaluation) {
    return NextResponse.json(
      { error: "This essay has already been evaluated." },
      { status: 409 },
    );
  }

  const rubric = getRubric(essay.institute, essay.level);
  if (!rubric) {
    return NextResponse.json(
      { error: "This institute/level combination is not supported yet." },
      { status: 400 },
    );
  }

  // Charged like any other evaluation. The original attempt was refunded if it failed
  // for a reason that never reached the model, and if it was not refunded then it did
  // reach one — either way this is a second call to pay for.
  const reservation = await reserveEvaluation(session.user.id);
  if (!reservation.ok) {
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

  let evaluation;
  try {
    evaluation = await evaluateEssay({
      institute: essay.prompt.institute,
      level: essay.prompt.level,
      promptTitle: essay.prompt.title,
      taskIntro: essay.prompt.taskIntro,
      stimulusText: essay.prompt.stimulusText,
      stimulusAuthor: essay.prompt.stimulusAuthor,
      instructions: essay.prompt.instructions,
      leitpunkte: essay.prompt.leitpunkte,
      register: essay.prompt.register,
      requiresSubject: essay.prompt.requiresSubject,
      rubric,
      essay: essay.content,
      wordCount: essay.wordCount,
    });
  } catch (error) {
    console.error("Retried evaluation failed", { essayId: essay.id, error });

    // Same refund rule as submission: a call the model never took costs nothing, so it
    // must not cost the learner a slot either — which matters more here, since this path
    // exists precisely because that already happened to them once.
    //
    // The two failures shared one sentence, "please try again in a minute", which is true
    // of an overloaded model and false of the per-day quota. This is the screen someone
    // reaches *because* an evaluation already failed, so it is the worst place to send
    // them round the loop again — upstreamFailureMessage answers from the quota Google
    // named instead of assuming.
    if (isQuotaError(error) || isOverloadedError(error)) {
      await releaseEvaluation(session.user.id);
      return NextResponse.json(
        { error: upstreamFailureMessage(error), id: essay.id },
        { status: isQuotaError(error) ? 429 : 503 },
      );
    }

    return NextResponse.json(
      { error: "We couldn't evaluate your essay right now. Your text is safe." },
      { status: 502 },
    );
  }

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
    // Unique on essayId, so a concurrent retry that won the race lands here. That is a
    // success from the learner's point of view — the essay now has its verdict — and the
    // slot this request reserved bought nothing, so it goes back.
    const existing = await prisma.evaluation.findUnique({
      where: { essayId: essay.id },
      select: { id: true },
    });
    if (existing) {
      await releaseEvaluation(session.user.id);
      return NextResponse.json({ id: essay.id }, { status: 200 });
    }

    console.error("Saving the retried evaluation failed", {
      essayId: essay.id,
      raw: evaluation.raw,
      error,
    });
    return NextResponse.json(
      { error: "Your essay was evaluated but the result couldn't be saved." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: essay.id }, { status: 200 });
}
