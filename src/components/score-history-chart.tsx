import Link from "next/link";
import type { Level } from "@/generated/prisma/client";
import { asPercent, isPass, plotWindow, PASS_RATIO, type Attempt } from "@/lib/progress";

/**
 * One level's score history as columns rising from a zero baseline.
 *
 * Columns rather than a line: attempts are discrete events at irregular dates, and a
 * line segment between them would assert scores that were never measured. A zeroed
 * essay would also become a cliff to the floor and back, which is exactly the
 * misreading `zeroedCount` exists to prevent.
 *
 * Every value is read against a fixed 0..100% scale with the pass mark drawn in, because
 * the question a learner actually has is "am I over the line", not "what is the shape".
 * Auto-scaling to the data would answer neither.
 *
 * No charting dependency: the marks are divs over the same track-and-fill idiom as the
 * criteria breakdown, and an SVG would cost hand-drawn focus rings and text that does
 * not inherit rem sizing, for nothing this chart needs.
 */

/** Tall enough that neighbouring scores separate: 13% of the scale is ~15px, not ~6px. */
const PLOT_H = "h-28";
/**
 * Bar marks cap at 24px — wider reads as a block, and the cell already clears a tap
 * target. Narrower on a phone because the columns cannot shrink: they are fixed-width
 * and `shrink-0` by nature, so `w-fit` on the plot resolves to their combined
 * min-content and a full window of them overflowed the card rather than being capped.
 * A full window has to fit the narrowest viewport by construction.
 */
const CELL_W = "w-3 sm:w-6";
const CELL_GAP = "gap-0.5 sm:gap-2";
/** Width of the y-axis gutter, mirrored by a spacer on the date row so columns line up. */
const GUTTER_W = "w-8";
/** A zero still has to be visible without pretending to have height. */
const ZERO_STUB = "h-[3px]";

const shortDate = (d: Date) =>
  d.toLocaleDateString("de-DE", { day: "numeric", month: "numeric" });
const longDate = (d: Date) =>
  d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
const points = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 2 });

/**
 * The two endpoint labels for the time axis.
 *
 * A whole history written in one sitting printed the same date at both ends ("4.8. 4.8."),
 * which reads as a rendering fault rather than as "all on one day" — so a single-day span
 * collapses to one centred label. And because the short form carries no year, two ends a
 * year apart would render identically for the opposite reason; those get the year back.
 */
function dateAxis(first: Date, last: Date) {
  if (first.toDateString() === last.toDateString()) {
    return { sameDay: true as const, first: shortDate(first), last: shortDate(last) };
  }
  const collides = shortDate(first) === shortDate(last);
  const fmt = collides ? (d: Date) => d.toLocaleDateString("de-DE") : shortDate;
  return { sameDay: false as const, first: fmt(first), last: fmt(last) };
}

/** Chrome is English to match the dashboard around it; only scored data stays German. */
function accessibleName(level: Level, a: Attempt) {
  const head = `${level}, ${longDate(a.createdAt)}: ${points(a.score)} of ${points(a.maxScore)}, ${asPercent(a.ratio)} percent`;
  if (a.zeroed) return `${head}, zeroed: ${a.zeroedReason}`;
  return `${head}, ${isPass(a.ratio) ? "above the pass mark" : "below the pass mark"}`;
}

/**
 * A single value is not a chart: one column on a wide axis reads as a progress meter
 * filled to some percentage, which is the opposite of what it means. The headline number
 * above already says everything there is to say.
 */
export const hasScoreHistory = (attempts: Attempt[]) => attempts.length >= 2;

export function ScoreHistoryChart({ level, attempts }: { level: Level; attempts: Attempt[] }) {
  if (!hasScoreHistory(attempts)) return null;

  const shown = plotWindow(attempts);
  const best = shown.reduce((a, b) => (b.ratio > a.ratio ? b : a));
  const latest = shown[shown.length - 1];

  // Label the endpoint, the extreme and every zero — not every column. A number over
  // each bar is noise that goes unread, and the axis plus the essay list below carry
  // the rest without gating anything behind a hover.
  //
  // Claimed in priority order, skipping any column touching one already claimed: a label
  // is wider than the 12px column it is centred on, so two on neighbouring bars run into
  // each other ("100" and "95" rendering as "10095"). Dropping the lower-priority one
  // beats printing both illegibly — the value is still on the bar's own link.
  const labelled = new Set<string>();
  const claimedAt: number[] = [];
  for (const a of [latest, best, ...shown.filter((x) => x.zeroed)]) {
    const i = shown.indexOf(a);
    if (labelled.has(a.id) || claimedAt.some((c) => Math.abs(c - i) < 2)) continue;
    labelled.add(a.id);
    claimedAt.push(i);
  }

  const axis = dateAxis(shown[0].createdAt, latest.createdAt);
  const span = axis.sameDay ? axis.first : `${axis.first} – ${axis.last}`;
  const series = shown
    .map((a) => (a.zeroed ? `${asPercent(a.ratio)} (${a.zeroedReason})` : String(asPercent(a.ratio))))
    .join(", ");

  return (
    <figure className="mt-3">
      {/* Names the level on the plot itself. The heading that says "B1" is a whole block
          away by the time the eye reaches the columns, and three levels stacked in one
          card leave nothing saying whose attempts these are. */}
      <figcaption className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{level}</span> score history ·{" "}
        {shown.length === attempts.length
          ? `${shown.length} scored attempt${shown.length === 1 ? "" : "s"}`
          : `last ${shown.length} of ${attempts.length} scored attempts`}
        {/* The whole series as text. The columns carry links, so this is the only place
            the shape itself is narrated. */}
        <span className="sr-only">
          , {span}: {series} percent. Pass mark {asPercent(PASS_RATIO)} percent.
        </span>
      </figcaption>

      {/* `w-fit` so the axis ends just past the last column instead of stretching to the
          card. Ruling off two thirds of an empty card reads as missing data rather than
          as room to grow; the plot simply widens as attempts accumulate. */}
      <div className="flex w-fit gap-2 pt-5">
        <div className={`relative shrink-0 ${GUTTER_W} ${PLOT_H}`} aria-hidden>
          {[
            { at: 100, label: "100%", note: null },
            // The pass mark is named in the gutter rather than at the line's right end:
            // a label out there needs reserved width, which pushed the whole plot wider
            // than its grid cell and let it bleed into the next level's column.
            { at: asPercent(PASS_RATIO), label: `${asPercent(PASS_RATIO)}%`, note: "pass" },
            { at: 0, label: "0%", note: null },
          ].map((tick) => (
            <span
              key={tick.at}
              // Percentage `bottom` resolves against the parent's height, which is fixed
              // here; the half-height shift sits the digits on their own rule.
              className="absolute right-0 translate-y-1/2 text-right text-[10px] leading-tight tabular-nums text-muted-foreground"
              style={{ bottom: `${tick.at}%` }}
            >
              {tick.label}
              {tick.note && <span className="block">{tick.note}</span>}
            </span>
          ))}
        </div>

        {/* Sized by the bar row, so the date line below can span exactly it. */}
        <div>
          <div className={`relative ${PLOT_H}`}>
          {/* Grid, under the marks: solid hairlines, one step off the surface. */}
          <div aria-hidden>
            <div className="absolute inset-x-0 top-0 border-t border-border" />
            <div className="absolute inset-x-0 bottom-0 border-t border-border" />
          </div>

          <ol className={`relative flex ${PLOT_H} ${CELL_GAP}`}>
            {shown.map((a) => {
              const pct = Math.max(0, Math.min(100, a.ratio * 100));
              const isZero = pct === 0;
              return (
                <li key={a.id} className={`relative ${PLOT_H} ${CELL_W}`}>
                  {/* No resting track behind the fill: the gridlines already carry the
                      scale, and a full-strength muted block competes with the mark for
                      attention. It appears on hover, which is when it should. */}
                  <Link
                    href={`/essays/${a.id}`}
                    prefetch={false}
                    aria-label={accessibleName(level, a)}
                    // Supplements the labels rather than carrying them: pointing at any
                    // column should name its level, date and score without a click, but
                    // nothing is only reachable this way.
                    title={accessibleName(level, a)}
                    className="absolute -inset-x-0.5 inset-y-0 rounded-sm transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  />
                  {/*
                    Anchored to the bottom by absolute positioning, not by a top margin:
                    a percentage margin resolves against the parent's WIDTH, so on a wide
                    bar it pushed the fill clean out of view and every partial score
                    rendered as an empty track. A percentage height does resolve against
                    the parent's height, which is fixed here.

                    A zero gets a fixed stub instead of a faked minimum height, so it sits
                    honestly at the baseline and still reads. Red is reserved for a rule
                    zero, so a genuine 0 scored on merit stays the series colour.
                  */}
                  <div
                    className={`pointer-events-none absolute inset-x-0 bottom-0 rounded-t-sm ${
                      a.zeroed ? "bg-destructive" : "bg-primary"
                    } ${isZero ? ZERO_STUB : ""}`}
                    style={isZero ? undefined : { height: `${pct}%` }}
                  />
                  {labelled.has(a.id) && (
                    <span
                      className={`pointer-events-none absolute inset-x-0 text-center text-[10px] tabular-nums ${
                        a.id === latest.id ? "font-medium text-foreground" : "text-muted-foreground"
                      }`}
                      style={{ bottom: `calc(${isZero ? 0 : pct}% + 5px)` }}
                    >
                      {asPercent(a.ratio)}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          {/*
            The pass mark rides OVER the columns, unlike the grid beneath them. Drawn
            under, it was chopped into fragments wherever a score cleared 60% — which is
            most of them — and the one line a learner needs to trace across the whole plot
            became the hardest thing to follow. Dashed because dashing reads as
            "threshold"; that is exactly why the gridlines stay solid.
          */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-success/70"
              style={{ bottom: `${asPercent(PASS_RATIO)}%` }}
            />
          </div>

          {/*
            Only the endpoints are dated — a label under every column would be unreadable
            at this width, and the span is what says whether this is a month or a year.

            Pinned to the two ends of the bar row rather than centred inside the first and
            last columns: centred on a 12px column a date overflows its cell by more than
            its own width, so on a two-column plot the pair collided into "4.7.5.7.".
            Anchored to the edges they grow away from each other and cannot meet.
          */}
          <div
            className={`mt-1.5 flex gap-2 text-[10px] whitespace-nowrap text-muted-foreground ${
              axis.sameDay ? "justify-center" : "justify-between"
            }`}
            aria-hidden
          >
            <span>{axis.first}</span>
            {!axis.sameDay && <span>{axis.last}</span>}
          </div>
        </div>
      </div>
    </figure>
  );
}
