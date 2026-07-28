import type { CriterionScore } from "@/lib/gemini";

const BAND_CLASS: Record<string, string> = {
  A: "bg-success/10 text-success",
  B: "bg-success/10 text-success",
  C: "bg-warning/10 text-warning",
  D: "bg-destructive/10 text-destructive",
};

export function CriteriaBreakdown({
  criteria,
  bonusPoints,
  rawScore,
  overallScore,
  maxScore,
}: {
  criteria: CriterionScore[];
  bonusPoints: number;
  rawScore: number;
  overallScore: number;
  maxScore: number;
}) {
  // Highest obtainable criterion total, e.g. 15 for telc B1 (3 criteria x 5 points).
  const maxRawScore = criteria.reduce((sum, c) => sum + c.maxScore, 0);
  // telc multiplies the criterion total to reach the official scale (x3 for B1).
  const multiplier = maxRawScore > 0 ? maxScore / maxRawScore : 1;

  // "5 + 3 + 3", or "5 + 3 + 3 + 1" once a Zusatzpunkt is granted. Spelling the sum
  // out saves scrolling back up to the criteria to check where the total came from,
  // and makes a zeroed letter read as "0 + 0 + 0" rather than an unexplained 0.
  const addends = [
    ...criteria.map((c) => c.score),
    ...(bonusPoints > 0 ? [bonusPoints] : []),
  ].join(" + ");

  return (
    <div className="space-y-5">
      {criteria.map((c) => (
        <div key={c.key}>
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="font-medium">{c.label}</span>
            <span className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  BAND_CLASS[c.band] ?? ""
                }`}
              >
                {c.band}
              </span>
              <span className="text-muted-foreground">
                {c.score} / {c.maxScore}
              </span>
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${Math.max(0, Math.min(100, (c.score / c.maxScore) * 100))}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground italic">{c.bandDescriptor}</p>
          <p className="mt-1 text-sm text-muted-foreground">{c.comment}</p>
        </div>
      ))}

      {/*
        Each label shows the arithmetic that produced its own value, so every number
        here can be traced without leaving the line: the addends for Rohpunkte, and
        what actually gets multiplied for the Gesamtpunktzahl.
      */}
      <div className="space-y-2 border-t pt-3 text-sm">
        <div className="flex items-center justify-between font-medium">
          <span>
            Rohpunkte{" "}
            <span className="font-normal text-muted-foreground">({addends})</span>
          </span>
          <span>
            {rawScore} / {maxRawScore}
          </span>
        </div>

        {multiplier !== 1 && (
          <div className="flex items-center justify-between font-medium">
            <span>
              Gesamtpunktzahl{" "}
              <span className="font-normal text-muted-foreground">
                ({rawScore} × {multiplier})
              </span>
            </span>
            <span>
              {overallScore} / {maxScore}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
