import { Badge } from "@/components/ui/badge";
import type { Institute, Level, EssayStatus } from "@/generated/prisma/client";
import { displayStatus } from "@/lib/essayStatus";

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
  // 60% is telc's pass threshold across the written exam; used here as a colour cue only.
  const variant = maxScore > 0 && overallScore / maxScore >= 0.6 ? "default" : "destructive";
  return (
    <Badge variant={variant}>
      {overallScore}/{maxScore}
    </Badge>
  );
}
