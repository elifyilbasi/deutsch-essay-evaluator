import { Badge } from "@/components/ui/badge";
import type { Institute, Level, EssayStatus } from "@/generated/prisma/client";

export function InstituteLevelBadge({ institute, level }: { institute: Institute; level: Level }) {
  return (
    <Badge variant="secondary">
      {institute} {level}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: EssayStatus }) {
  if (status === "EVALUATED") return <Badge variant="default">Evaluated</Badge>;
  if (status === "SUBMITTED") return <Badge variant="outline">Submitted</Badge>;
  return <Badge variant="outline">Draft</Badge>;
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
