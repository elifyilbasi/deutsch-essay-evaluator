import Link from "next/link";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { Level } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasScoreHistory, ScoreHistoryChart } from "@/components/score-history-chart";
import { asPercent, levelSlots, type LevelProgress } from "@/lib/progress";

/**
 * Per-level progress. Percentages rather than raw scores throughout, because the
 * scales differ between levels and a bar drawn from a raw score would make 9/10 at A1
 * look worse than 27/45 at B1.
 *
 * Density follows the data rather than a fixed shape. A learner works at one level at a
 * time, so most levels sit at one or two attempts forever while one accumulates a real
 * history — and a layout that gives them equal footprints spends most of the card on
 * nothing. An equal-cell grid was worse still: grid rows stretch to their tallest cell,
 * so a level with no chart was padded out to the height of one that had it.
 *
 * So: a level with a history gets a full-width block and a chart, and every other level
 * collapses to a single line. Ladder order throughout, so the card still reads the way a
 * learner progresses.
 */
export function ProgressSummary({ progress }: { progress: LevelProgress[] }) {
  if (progress.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your progress</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {levelSlots(progress).map(({ level, progress: p }) =>
          p === null ? (
            <UnattemptedRow key={level} level={level} />
          ) : hasScoreHistory(p.attempts) ? (
            <ChartedLevel key={level} level={p} />
          ) : (
            <CompactRow key={level} level={p} />
          ),
        )}
      </CardContent>
    </Card>
  );
}

/** The level being worked at: the number that matters, its movement, and the history. */
function ChartedLevel({ level }: { level: LevelProgress }) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium">{level.level}</span>
        {/* Proportional figures, not tabular: equal-width digits make a large standalone
            number look loose. */}
        <span className="text-2xl leading-none font-semibold">
          {asPercent(level.latest.ratio)}%
        </span>
        <Delta deltaRatio={level.deltaRatio} />
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">
        best {asPercent(level.best.ratio)}% · average {asPercent(level.averageRatio)}% ·{" "}
        {level.passedCount} of {level.attempts.length} above the pass mark
      </p>

      <ScoreHistoryChart level={level.level} attempts={level.attempts} />

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <AttemptCount level={level} />
        <ZeroedBadge count={level.zeroedCount} />
      </div>
    </div>
  );
}

/**
 * A level with too little history to plot. One line, because a second attempt is what
 * makes a trend and until then the number says everything a chart would.
 *
 * No delta here by construction: a level lands in this row only with fewer than two
 * scored attempts, which is exactly when `deltaRatio` is null.
 */
function CompactRow({ level }: { level: LevelProgress }) {
  return (
    <Row
      level={level.level}
      value={`${asPercent(level.latest.ratio)}%`}
      trailing={
        <>
          <AttemptCount level={level} />
          <ZeroedBadge count={level.zeroedCount} />
        </>
      }
    />
  );
}

/**
 * A level that is offered but not yet attempted. It keeps its line rather than being
 * omitted: an empty rung is what tells a learner where the ladder goes next.
 */
function UnattemptedRow({ level }: { level: Level }) {
  return (
    <Row
      level={level}
      value={<span className="text-muted-foreground/50">—</span>}
      trailing={
        <span>
          No attempts yet ·{" "}
          <Link href={`/write?level=${level}`} className="underline">
            write one
          </Link>
        </span>
      }
    />
  );
}

function Row({
  level,
  value,
  trailing,
}: {
  level: Level;
  value: React.ReactNode;
  trailing: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-sm first:pt-0 last:pb-0">
      <span className="flex items-baseline gap-2">
        <span className="font-medium">{level}</span>
        <span className="font-semibold">{value}</span>
      </span>
      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {trailing}
      </span>
    </div>
  );
}

function AttemptCount({ level }: { level: LevelProgress }) {
  return (
    <span>
      {level.totalAttempts} attempt{level.totalAttempts === 1 ? "" : "s"}
      {level.totalAttempts > level.attempts.length &&
        ` · ${level.totalAttempts - level.attempts.length} awaiting evaluation`}
    </span>
  );
}

/**
 * Called out rather than folded in: a single off-topic essay can drag an average hard,
 * and the learner should know that is what happened.
 */
function ZeroedBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return <Badge variant="destructive">{count} zeroed (Thema verfehlt)</Badge>;
}

/**
 * Movement since the previous attempt, in percentage points. Nothing is rendered on a
 * first attempt — there is no direction yet, and an arrow pointing at nothing invites
 * the reader to invent a trend.
 */
function Delta({ deltaRatio }: { deltaRatio: number | null }) {
  if (deltaRatio === null) return null;

  const points = asPercent(deltaRatio);
  // Rounding decides the direction, so a change too small to print never draws an arrow.
  const { Icon, tone, label } =
    points > 0
      ? { Icon: TrendingUp, tone: "text-success", label: `+${points}` }
      : points < 0
        ? { Icon: TrendingDown, tone: "text-destructive", label: String(points) }
        : { Icon: Minus, tone: "text-muted-foreground", label: "0" };

  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${tone}`}>
      <Icon className="size-3.5" aria-hidden />
      {label}
      {/* Unit is spoken but not printed: the arrow and the neighbouring "%" already
          make it unambiguous on screen, and "pp" would not. */}
      <span className="sr-only">percentage points</span>
      <span className="text-muted-foreground">since last</span>
    </span>
  );
}
