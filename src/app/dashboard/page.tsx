import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstituteLevelBadge, ScoreBadge, StatusBadge } from "@/components/essay-badges";
import { DeleteEssayButton } from "@/components/delete-essay-button";
import { ProgressSummary } from "@/components/progress-summary";
import { progressByLevel } from "@/lib/progress";

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

  const progress = progressByLevel(essays);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your essays</h1>
        <Button nativeButton={false} render={<Link href="/write">Write new essay</Link>} />
      </div>

      <ProgressSummary progress={progress} />

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
                  <DeleteEssayButton essayId={essay.id} />
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
