import type { CriterionScore } from "@/lib/gemini";

/** telc writes half marks with a comma ("1,5"), and whole marks without a decimal. */
const formatPoints = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toLocaleString("de-DE", { maximumFractionDigits: 2 });

const BAND_CLASS: Record<string, string> = {
  // telc B2's band for a performance above the target level. Worth the same as A, so it
  // wears the same colour — the distinction it carries is in the letter, not the score.
  "A*": "bg-success/10 text-success",
  A: "bg-success/10 text-success",
  B: "bg-success/10 text-success",
  C: "bg-warning/10 text-warning",
  D: "bg-destructive/10 text-destructive",
};

export function CriteriaBreakdown({
  criteria,
  rawScore,
  overallScore,
  maxScore,
  scaleLabel,
}: {
  criteria: CriterionScore[];
  rawScore: number;
  overallScore: number;
  maxScore: number;
  /** The exam part this total covers, e.g. "Schreiben, Teil 2". */
  scaleLabel?: string;
}) {
  // Highest obtainable criterion total, e.g. 15 for telc B1 (3 criteria x 5 points).
  const maxRawScore = criteria.reduce((sum, c) => sum + c.maxScore, 0);
  // telc multiplies the criterion total to reach the official scale (x3 for B1).
  const multiplier = maxRawScore > 0 ? maxScore / maxRawScore : 1;

  // "5 + 3 + 3". Spelling the sum out saves scrolling back up to the criteria to
  // check where the total came from, and makes a zeroed letter read as "0 + 0 + 0"
  // rather than an unexplained 0.
  const addends = criteria.map((c) => formatPoints(c.score)).join(" + ");

  return (
    <div className="space-y-5">
      {criteria.map((c) => (
        <div key={c.key}>
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="font-medium">{c.label}</span>
            <span className="flex shrink-0 items-center gap-2">
              {/* Content marks awarded per Inhaltspunkt (telc A1) carry no band. */}
              {c.band && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    BAND_CLASS[c.band] ?? ""
                  }`}
                >
                  {c.band}
                </span>
              )}
              <span className="text-muted-foreground">
                {formatPoints(c.score)} / {formatPoints(c.maxScore)}
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
        {/* Names the exam part, so a total is never read as a subtest or exam score. */}
        {scaleLabel && (
          <p className="text-xs text-muted-foreground">{scaleLabel}</p>
        )}
        <div className="flex items-center justify-between font-medium">
          <span>
            {/* "Roh" only means anything where a multiplier follows (telc B1, x3). */}
            {multiplier === 1 ? "Punkte" : "Rohpunkte"}{" "}
            <span className="font-normal text-muted-foreground">({addends})</span>
          </span>
          <span>
            {formatPoints(rawScore)} / {formatPoints(maxRawScore)}
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
