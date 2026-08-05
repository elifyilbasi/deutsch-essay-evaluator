import { Badge } from "@/components/ui/badge";
import { formatWordRange, wordsOutOfRange as isOutOfRange } from "@/lib/wordCount";

/**
 * What the candidate was actually asked to do: the instruction line, the numbered
 * Leitpunkte, and the formal constraints.
 *
 * Shared by the write wizard and the feedback page. On the feedback page it is the
 * difference between "Leitpunkt 3 is missing" being a judgement you can check and one
 * you have to take on trust — that page used to render three of the Prompt's twelve
 * fields, and the numbered points were not among them.
 *
 * Plain props, no rubric import: `src/lib/rubrics` is server-side by intent, and
 * pulling it in here would drag the grids into the client bundle. The caller passes
 * `timeLimitMinutes` — the prompts API already attaches it for exactly this reason.
 */
export type TaskBriefProps = {
  instructions: string;
  leitpunkte: string[];
  register: "DU" | "SIE";
  requiresSubject: boolean;
  stimulusAuthor: string | null;
  minWords: number;
  /** Null where the level sets no ceiling, e.g. telc B2. */
  maxWords: number | null;
  timeLimitMinutes: number | null;
  /** Set on the feedback page to show what was written against what was asked. */
  actualWordCount?: number;
  /** Seconds actually spent writing, likewise. */
  actualSeconds?: number;
};

function formatMinutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TaskBrief({
  instructions,
  leitpunkte,
  register,
  requiresSubject,
  stimulusAuthor,
  minWords,
  maxWords,
  timeLimitMinutes,
  actualWordCount,
  actualSeconds,
}: TaskBriefProps) {
  const wordsOutOfRange =
    actualWordCount !== undefined && isOutOfRange(actualWordCount, minWords, maxWords);
  const overTime =
    actualSeconds !== undefined &&
    timeLimitMinutes !== null &&
    actualSeconds > timeLimitMinutes * 60;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm">{instructions}</p>
        <ul className="mt-3 space-y-1.5">
          {leitpunkte.map((punkt, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-muted-foreground">{i + 1}.</span>
              <span className="font-medium">{punkt}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">{register === "SIE" ? "Formell — Sie" : "Informell — du"}</Badge>
        {requiresSubject && <Badge variant="outline">Betreff nötig</Badge>}
        {stimulusAuthor && <Badge variant="outline">Antwort an {stimulusAuthor}</Badge>}
        <Badge variant={wordsOutOfRange ? "destructive" : "outline"}>
          {formatWordRange(minWords, maxWords)} Wörter
          {actualWordCount !== undefined && ` · geschrieben: ${actualWordCount}`}
        </Badge>
        {timeLimitMinutes !== null && (
          <Badge variant={overTime ? "destructive" : "outline"}>
            {timeLimitMinutes} Minuten
            {actualSeconds !== undefined && ` · gebraucht: ${formatMinutes(actualSeconds)}`}
          </Badge>
        )}
      </div>
    </div>
  );
}
