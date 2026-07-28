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

export function LeitpunktCoverageList({ coverage }: { coverage: LeitpunktCoverage[] }) {
  if (coverage.length === 0) {
    return null;
  }

  const covered = coverage.filter((c) => c.status === "ADDRESSED").length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {covered} of {coverage.length} points fully covered
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
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${style.badgeClass}`}
                >
                  {style.label}
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
