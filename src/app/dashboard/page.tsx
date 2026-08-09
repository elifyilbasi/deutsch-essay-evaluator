import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstituteLevelBadge, ScoreBadge, StatusBadge } from "@/components/essay-badges";
import { DeleteEssayButton } from "@/components/delete-essay-button";
import { ProgressSummary } from "@/components/progress-summary";
import { asPercent, progressByLevel, ratioOf } from "@/lib/progress";

/** Enough history to see a trend without an unbounded query as attempts pile up. */
const RECENT_LIMIT = 50;

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const essays = await prisma.essay.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: RECENT_LIMIT,
    select: {
      id: true,
      institute: true,
      level: true,
      wordCount: true,
      status: true,
      createdAt: true,
      prompt: { select: { title: true } },
      evaluation: {
        select: { overallScore: true, maxScore: true, zeroedReason: true },
      },
    },
  });

  // Counted over the whole history, not the RECENT_LIMIT window above, so a level whose
  // essays are all older than that window is not reported as never attempted. Grouped in
  // the database rather than fetched, so it stays one cheap row per level.
  const totals = await prisma.essay.groupBy({
    by: ["level"],
    where: { userId },
    _count: { _all: true },
  });
  const totalByLevel = Object.fromEntries(
    totals.map((row) => [row.level, row._count._all]),
  );

  const progress = progressByLevel(essays);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your essays</h1>
        <Button nativeButton={false} render={<Link href="/write">Write new essay</Link>} />
      </div>

      <ProgressSummary progress={progress} totalByLevel={totalByLevel} />

      {essays.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You haven&apos;t submitted any essays yet.{" "}
            <Link href="/write" className="underline">
              Write your first one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {essays.map((essay) => (
            <Card key={essay.id} className="transition-colors hover:bg-muted/50">
              <CardHeader className="items-center">
                <Link href={`/essays/${essay.id}`} className="min-w-0">
                  <CardTitle className="truncate">{essay.prompt.title}</CardTitle>
                </Link>
                <CardAction className="flex items-center gap-2">
                  <InstituteLevelBadge institute={essay.institute} level={essay.level} />
                  <StatusBadge status={essay.status} hasEvaluation={essay.evaluation !== null} />
                  {essay.evaluation && (
                    <ScoreBadge
                      overallScore={essay.evaluation.overallScore}
                      maxScore={essay.evaluation.maxScore}
                    />
                  )}
                  {/* The score is resolved here rather than in the button: this is where
                      the evaluation and its own `maxScore` are, and `totalByLevel` counts
                      the whole history — `progress` only covers the RECENT_LIMIT window,
                      so reading it would claim "your only A2 essay" to someone whose
                      others merely fell outside that window. */}
                  <DeleteEssayButton
                    essayId={essay.id}
                    level={essay.level}
                    scorePercent={
                      essay.evaluation
                        ? asPercent(
                            ratioOf(essay.evaluation.overallScore, essay.evaluation.maxScore),
                          )
                        : null
                    }
                    isOnlyAttempt={totalByLevel[essay.level] === 1}
                  />
                </CardAction>
              </CardHeader>
              <Link href={`/essays/${essay.id}`}>
                <CardContent className="text-sm text-muted-foreground">
                  {essay.wordCount} words &middot;{" "}
                  {new Date(essay.createdAt).toLocaleDateString()}
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
