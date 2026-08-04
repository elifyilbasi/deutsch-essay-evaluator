import { Badge } from "@/components/ui/badge";
import type { Institute, Level, EssayStatus } from "@/generated/prisma/client";
import { displayStatus } from "@/lib/essayStatus";
import { isPass, ratioOf } from "@/lib/progress";

export function InstituteLevelBadge({ institute, level }: { institute: Institute; level: Level }) {
  return (
    <Badge variant="secondary">
      {institute} {level}
    </Badge>
  );
}

/**
 * Takes the evaluation's presence, not just the column: "Evaluated" is a fact about
 * whether an evaluation exists, and reading it off `status` alone once produced an
 * "Evaluated" badge above a page saying the essay had never been evaluated.
 */
export function StatusBadge({
  status,
  hasEvaluation,
}: {
  status: EssayStatus;
  hasEvaluation: boolean;
}) {
  switch (displayStatus({ status, hasEvaluation })) {
    case "evaluated":
      return <Badge variant="default">Evaluated</Badge>;
    case "submitted":
      return <Badge variant="outline">Not evaluated</Badge>;
    default:
      return <Badge variant="outline">Draft</Badge>;
  }
}

export function ScoreBadge({
  overallScore,
  maxScore,
}: {
  overallScore: number;
  maxScore: number;
}) {
  // Same threshold the progress chart draws its pass line at, so a badge and a bar can
  // never disagree about whether an essay passed. Colour cue only.
  const variant = isPass(ratioOf(overallScore, maxScore)) ? "default" : "destructive";
  return (
    <Badge variant={variant}>
      {overallScore}/{maxScore}
    </Badge>
  );
}
