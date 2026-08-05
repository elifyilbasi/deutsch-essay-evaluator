import { Check, Minus, X } from "lucide-react";
import type { LeitpunktCoverage } from "@/lib/gemini";

const STATUS_STYLES = {
  ADDRESSED: {
    icon: Check,
    label: "Covered",
    iconClass: "text-success",
    badgeClass: "bg-success/10 text-success",
  },
  PARTIAL: {
    icon: Minus,
    label: "Partly covered",
    iconClass: "text-warning",
    badgeClass: "bg-warning/10 text-warning",
  },
  MISSING: {
    icon: X,
    label: "Missing",
    iconClass: "text-destructive",
    badgeClass: "bg-destructive/10 text-destructive",
  },
} as const;

export function LeitpunktCoverageList({
  coverage,
  /**
   * How many treated points the level actually asks for, where that is fewer than the
   * number printed. telc B2 wants three, and lets one of them be an aspect of the
   * candidate's own — so a correct letter can leave two printed Punkte untouched, and
   * "2 of 5 fully covered" would report a pass as a failure.
   */
  expectedTotal,
}: {
  coverage: LeitpunktCoverage[];
  expectedTotal?: number;
}) {
  if (coverage.length === 0) {
    return null;
  }

  const covered = coverage.filter((c) => c.status === "ADDRESSED").length;
  const required = expectedTotal ?? coverage.length;
  const ownCovered = coverage.filter(
    (c) => c.selfChosen && c.status === "ADDRESSED",
  ).length;

  return (
    <div className="space-y-3">
      {/* Clamped, because a level can ask for fewer points than it prints: telc B2
          requires three of four, so covering all four read as "4 of 3 required points".
          The surplus is real work and is reported, just not as part of the requirement. */}
      <p className="text-sm text-muted-foreground">
        {Math.min(covered, required)} of {required} required points fully covered
        {covered > required && ` · ${covered - required} more beyond the requirement`}
        {ownCovered > 0 &&
          ` · ${ownCovered} of them ${ownCovered === 1 ? "an aspect" : "aspects"} of your own`}
      </p>

      <ul className="space-y-2">
        {coverage.map((item, i) => {
          const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.PARTIAL;
          const Icon = style.icon;

          return (
            <li key={i} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <Icon className={`mt-0.5 size-4 shrink-0 ${style.iconClass}`} />
                  <span className="text-sm font-medium">{item.leitpunkt}</span>
                </div>
                <span className="flex shrink-0 items-center gap-2">
                  {/* Marked so a self-chosen aspect is never read as a task Leitpunkt
                      the candidate somehow invented. */}
                  {item.selfChosen && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Your own aspect
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.badgeClass}`}
                  >
                    {style.label}
                  </span>
                </span>
              </div>
              <p className="mt-1.5 pl-6 text-sm text-muted-foreground">{item.comment}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
