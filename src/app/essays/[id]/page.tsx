import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstituteLevelBadge, ScoreBadge } from "@/components/essay-badges";
import { CriteriaBreakdown } from "@/components/criteria-breakdown";
import { AnnotatedEssay } from "@/components/annotated-essay";
import { LeitpunktCoverageList } from "@/components/leitpunkt-coverage";
import { TaskBrief } from "@/components/task-brief";
import { EvaluateEssayButton } from "@/components/evaluate-essay-button";
import { formatDuration } from "@/lib/formatDuration";
import { getRubric } from "@/lib/rubrics";
import { reflowSoftWraps } from "@/lib/reflowSoftWraps";
import { NOT_COPYABLE } from "@/lib/examMaterial";
import type { CriterionScore, Correction, LeitpunktCoverage } from "@/lib/gemini";

export default async function EssayDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const essay = await prisma.essay.findUnique({
    where: { id },
    include: { prompt: true, evaluation: true },
  });

  if (!essay || essay.userId !== userId) {
    notFound();
  }

  const evaluation = essay.evaluation;
  // Level-specific labelling (which exam part these points are, and how it counts).
  const rubric = getRubric(essay.institute, essay.level);

  return (
    <div className="space-y-6">
      {/*
        Title and actions share the top row; the task intro runs full width beneath them.
        Sitting beside a shrink-0 cluster of badges it was squeezed into a narrow column
        and wrapped around them, and `items-center` floated the badges into the middle of
        that wrapped text rather than aligning them with the heading they belong to.
      */}
      <div>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h1 className="min-w-0 text-2xl font-semibold">{essay.prompt.title}</h1>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <InstituteLevelBadge institute={essay.institute} level={essay.level} />
            {evaluation && (
              <ScoreBadge
                overallScore={evaluation.overallScore}
                maxScore={evaluation.maxScore}
              />
            )}
            {/*
              Everything the write page needs to land straight on this task is already
              here on the essay, so no lookup endpoint is required. The wizard rejects
              anything it would not let you pick by hand.

              `secondary` rather than `outline`: an outline button is `bg-background` with
              a --border hairline, which on this off-white page is all but invisible and
              read as plain text next to two solid badges.
            */}
            <Link
              href={`/write?institute=${essay.institute}&level=${essay.level}&promptId=${essay.promptId}`}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Practise this task again
            </Link>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{essay.prompt.taskIntro}</p>
      </div>

      {essay.prompt.stimulusText && (
        <Card className={NOT_COPYABLE}>
          <CardHeader>
            {/* Named by what it is, on the same signal the prompt uses: a B1 task quotes
                a letter from a person, a B2 task reprints an advertisement and has no
                correspondent at all. Calling an Anzeige "the letter you replied to"
                invented one. */}
            <CardTitle className="text-base">
              {essay.prompt.stimulusAuthor
                ? "The letter you replied to"
                : "The advertisement you responded to"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Reflowed, not printed verbatim: the seed files wrap these at ~78
                characters for their own readability, and honouring that froze the
                advert at the width of the source file inside a full-width card. The
                breaks that mean something — bullets, addresses — survive. */}
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {reflowSoftWraps(essay.prompt.stimulusText)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* A withdrawn task can have its stimulus cleared (scripts/redact-retired-stimulus.ts),
          and without this the page contradicts itself: taskIntro above still announces
          "folgenden Brief", and nothing follows it. Say what happened instead.

          Gated on isActive, not on stimulusText alone. A1 and A2 tasks have no stimulus by
          design — the candidate writes cold from the Leitpunkte — so testing only for a
          missing letter would print a withdrawal notice on every A-level essay ever
          written. Only a retired task that HAS lost its text lands here. */}
      {!essay.prompt.stimulusText && !essay.prompt.isActive && (
        <Card className={NOT_COPYABLE}>
          <CardHeader>
            <CardTitle className="text-base">The letter you replied to</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This task has been withdrawn, and the letter it quoted is no longer
              available. Your essay below, and the result it was given, are unchanged.
            </p>
          </CardContent>
        </Card>
      )}

      {/*
        The same brief the writer saw. Without it, feedback like "Leitpunkt 3 is
        missing" names something that appears nowhere on the page — the coverage list
        below echoes the model's own wording, not the task's.
      */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">The task · Die Aufgabe</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskBrief
            instructions={essay.prompt.instructions}
            leitpunkte={essay.prompt.leitpunkte}
            register={essay.prompt.register}
            requiresSubject={essay.prompt.requiresSubject}
            stimulusAuthor={essay.prompt.stimulusAuthor}
            minWords={essay.prompt.minWords}
            maxWords={essay.prompt.maxWords}
            timeLimitMinutes={rubric?.timeLimitMinutes ?? null}
            actualWordCount={essay.wordCount}
            actualSeconds={essay.writingSeconds ?? undefined}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Your essay ({essay.wordCount} words
            {essay.writingSeconds !== null && (
              <>
                {" · "}
                {formatDuration(essay.writingSeconds)} writing time
              </>
            )}
            )
          </CardTitle>
        </CardHeader>
        <CardContent>
          {evaluation ? (
            <AnnotatedEssay
              essay={essay.content}
              corrections={evaluation.corrections as unknown as Correction[]}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm">{essay.content}</p>
          )}
        </CardContent>
      </Card>

      {evaluation ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{evaluation.resultLabel}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {evaluation.zeroedReason && (
                <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  Der gesamte Brief wurde mit 0 Punkten bewertet: {evaluation.zeroedReason}.
                </p>
              )}
              <p className="text-sm">{evaluation.summaryFeedback}</p>
              {/* Per level: the parts, totals and pass rules differ between them. */}
              {rubric && (
                <p className="text-xs text-muted-foreground">{rubric.scaleNote}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content points (Leitpunkte)</CardTitle>
            </CardHeader>
            <CardContent>
              <LeitpunktCoverageList
                coverage={evaluation.leitpunktCoverage as unknown as LeitpunktCoverage[]}
                expectedTotal={
                  // Two different ways a level asks for fewer points than it prints, and
                  // both have to reach the list or it reports a complete task as short:
                  // B2 lets one of three be a self-chosen aspect, while A2 prints four
                  // and marks the best three ("Wählen Sie drei aus"). The Inhaltspunkte
                  // row already scores A2 on three; this is the same number.
                  rubric?.selfChosenAspects?.expectedTotal ??
                  rubric?.contentPointScoring?.counted
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criteria breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <CriteriaBreakdown
                criteria={evaluation.criteriaScores as unknown as CriterionScore[]}
                rawScore={evaluation.rawScore}
                overallScore={evaluation.overallScore}
                maxScore={evaluation.maxScore}
                scaleLabel={rubric?.scaleLabel}
              />
            </CardContent>
          </Card>

        </>
      ) : (
        <Card>
          {/* An essay reaches this state when it was saved but the evaluation failed —
              a busy model is enough. Without an action here it stayed unscored for good. */}
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6 text-sm text-muted-foreground">
            <span>
              This essay hasn&apos;t been evaluated yet. Your text is saved — you can run
              the evaluation now.
            </span>
            <EvaluateEssayButton essayId={essay.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
