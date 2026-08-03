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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{essay.prompt.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{essay.prompt.taskIntro}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
          */}
          <Link
            href={`/write?institute=${essay.institute}&level=${essay.level}&promptId=${essay.promptId}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Practise this task again
          </Link>
        </div>
      </div>

      {essay.prompt.stimulusText && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">The letter you replied to</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
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
          <CardContent className="py-6 text-sm text-muted-foreground">
            This essay hasn&apos;t been evaluated yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
