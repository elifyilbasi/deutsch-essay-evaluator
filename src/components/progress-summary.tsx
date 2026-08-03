import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { asPercent, type LevelProgress } from "@/lib/progress";

/**
 * Per-level progress. Percentages rather than raw scores throughout, because the
 * scales differ between levels and a bar drawn from a raw score would make 9/10 at A1
 * look worse than 27/45 at B1.
 *
 * The bar is the same track-and-fill idiom as the criteria breakdown — no charting
 * dependency, and with a handful of attempts a row of bars reads better than a line.
 */
export function ProgressSummary({ progress }: { progress: LevelProgress[] }) {
  if (progress.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {progress.map((level) => (
          <div key={level.level}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{level.level}</span>
              <span className="text-sm text-muted-foreground">
                {level.totalAttempts} attempt{level.totalAttempts === 1 ? "" : "s"}
                {" · best "}
                <span className="font-medium text-foreground">
                  {asPercent(level.best.ratio)}%
                </span>
                {" · latest "}
                <span className="font-medium text-foreground">
                  {asPercent(level.latest.ratio)}%
                </span>
                {" · average "}
                {asPercent(level.averageRatio)}%
              </span>
            </div>

            {/* Oldest on the left, so the row reads left-to-right as time passing. */}
            <div className="mt-2 flex items-end gap-1" aria-hidden>
              {level.attempts.map((a, i) => (
                <div
                  key={i}
                  title={`${a.score}/${a.maxScore} · ${a.createdAt.toLocaleDateString()}`}
                  className="relative h-12 flex-1 overflow-hidden rounded-sm bg-muted"
                >
                  {/*
                    Anchored to the bottom by absolute positioning, not by a top
                    margin: a percentage margin resolves against the parent's WIDTH,
                    so on a wide bar it pushed the fill clean out of view and every
                    partial score rendered as an empty track. A percentage height does
                    resolve against the parent's height, which is fixed here.
                  */}
                  <div
                    className={`absolute inset-x-0 bottom-0 rounded-sm ${
                      a.zeroed ? "bg-destructive" : "bg-primary"
                    }`}
                    style={{ height: `${Math.max(2, Math.min(100, a.ratio * 100))}%` }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                {level.attempts.length} scored
                {level.totalAttempts > level.attempts.length &&
                  ` · ${level.totalAttempts - level.attempts.length} awaiting evaluation`}
              </span>
              {/* Called out rather than folded in: a single off-topic essay can drag
                  an average hard, and the learner should know that is what happened. */}
              {level.zeroedCount > 0 && (
                <Badge variant="destructive">
                  {level.zeroedCount} zeroed (Thema verfehlt)
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
