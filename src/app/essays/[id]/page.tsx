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
        <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
          {essay.prompt.taskIntro}
        </p>
      </div>

      {essay.prompt.stimulusText && (
        <Card>
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
            {/* Capped measure: the shell is wide so headers and charts have room, but a
                line of prose past ~75 characters is measurably harder to read, and this
                is a letter meant to be read. Same cap on the essay and the feedback. */}
            <p className="max-w-[70ch] whitespace-pre-wrap text-sm text-muted-foreground">
              {essay.prompt.stimulusText}
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
          <div className="max-w-[70ch]">
            {evaluation ? (
              <AnnotatedEssay
                essay={essay.content}
                corrections={evaluation.corrections as unknown as Correction[]}
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm">{essay.content}</p>
            )}
          </div>
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
              <p className="max-w-[70ch] text-sm">{evaluation.summaryFeedback}</p>
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
                expectedTotal={rubric?.selfChosenAspects?.expectedTotal}
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
