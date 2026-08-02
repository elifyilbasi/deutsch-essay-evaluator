"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { countWords } from "@/lib/wordCount";
import { WritingTimer, useWritingTimer } from "@/components/writing-timer";
import { safeJson, errorMessage } from "@/lib/safeJson";

type Institute = "TELC" | "GOETHE";
type Level = "A1" | "A2" | "B1" | "B2" | "C1";

type PromptSummary = {
  id: string;
  title: string;
  taskIntro: string;
  stimulusText: string | null;
  stimulusAuthor: string | null;
  instructions: string;
  leitpunkte: string[];
  register: "DU" | "SIE";
  requiresSubject: boolean;
  minWords: number;
  maxWords: number;
  timeLimitMinutes: number | null;
  practice: { attemptCount: number; bestScore: number; maxScore: number } | null;
};

/** How many tasks are shown before "Show more" is needed. */
const PAGE_SIZE = 3;

const INSTITUTES: { value: Institute; label: string; enabled: boolean }[] = [
  { value: "TELC", label: "TELC", enabled: true },
  { value: "GOETHE", label: "Goethe-Institut", enabled: false },
];

/**
 * Step heading: English leads (the UI language), with the German exam term after
 * it so learners pick up the vocabulary they'll meet on the real paper.
 */
function StepTitle({
  step,
  english,
  german,
}: {
  step: number;
  english: string;
  german: string;
}) {
  return (
    <CardTitle className="text-base">
      {step}. {english}{" "}
      <span className="font-normal text-muted-foreground">· {german}</span>
    </CardTitle>
  );
}

const LEVELS: { value: Level; label: string; enabled: boolean }[] = [
  { value: "A1", label: "A1", enabled: true },
  { value: "A2", label: "A2", enabled: true },
  { value: "B1", label: "B1", enabled: true },
  { value: "B2", label: "B2", enabled: false },
  { value: "C1", label: "C1", enabled: false },
];

export default function WritePage() {
  const router = useRouter();
  /** Idempotency key for the current attempt; see handleContentChange. */
  const submissionId = useRef<string | null>(null);
  const [institute, setInstitute] = useState<Institute>("TELC");
  const [level, setLevel] = useState<Level | null>(null);
  const [prompts, setPrompts] = useState<PromptSummary[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quota, setQuota] = useState<{ limit: number; remaining: number } | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const timer = useWritingTimer();

  useEffect(() => {
    fetch("/api/quota")
      .then((r) => (r.ok ? safeJson<{ limit: number; remaining: number }>(r) : null))
      .then((data) => data && setQuota(data));
  }, []);

  useEffect(() => {
    if (!level) return;

    let cancelled = false;
    fetch(`/api/prompts?institute=${institute}&level=${level}`)
      .then(async (r) => {
        if (!r.ok) {
          toast.error(await errorMessage(r, "Couldn't load the writing tasks."));
          return null;
        }
        return safeJson<{ prompts: PromptSummary[] }>(r);
      })
      .then((data) => {
        if (!cancelled) {
          setPrompts(data?.prompts ?? []);
          setSelectedPromptId(null);
          // A different level means a different task list, so collapse back to page one.
          setVisibleCount(PAGE_SIZE);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [institute, level]);

  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId) ?? null;
  const wordCount = countWords(content);

  /** Starts the clock on the first keystroke, matching how the exam actually feels. */
  function handleContentChange(value: string) {
    setContent(value);
    if (!timer.isRunning && value.length > 0) {
      timer.start();
    }
    // One id per attempt, minted with the first keystroke. If a submit times out and
    // the user retries, the server recognises the id and returns the essay it already
    // charged for rather than evaluating - and paying for - the same text twice.
    if (!submissionId.current) {
      submissionId.current = crypto.randomUUID();
    }
  }

  async function handleSubmit() {
    if (!selectedPrompt) return;
    setIsSubmitting(true);
    timer.stop();
    try {
      const response = await fetch("/api/essays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: selectedPrompt.id,
          content,
          writingSeconds: timer.elapsedSeconds,
          submissionId: submissionId.current,
        }),
      });

      if (!response.ok) {
        toast.error(await errorMessage(response, "Couldn't evaluate your essay."));
        // Let them keep working on a failed submission rather than freezing the clock.
        timer.start();
        return;
      }

      const data = await safeJson<{ id?: string }>(response);
      if (!data?.id) {
        toast.error("Your essay was submitted but the server sent no result. Please retry.");
        timer.start();
        return;
      }

      toast.success("Essay evaluated!");
      // Cleared only once the attempt is genuinely finished, so every retry in
      // between reuses the same id.
      submissionId.current = null;
      router.push(`/essays/${data.id}`);
    } catch (error) {
      // Network failure or an aborted request never reaches the response checks above.
      console.error("Essay submission failed", error);
      toast.error("Couldn't reach the server. Check your connection and try again.");
      timer.start();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Write a new essay</h1>

      <Card>
        <CardHeader>
          <StepTitle step={1} english="Choose your exam" german="Prüfung und Niveau wählen" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Institute</p>
            <div className="flex flex-wrap gap-2">
              {INSTITUTES.map((i) => (
                <Button
                  key={i.value}
                  type="button"
                  variant={institute === i.value ? "default" : "outline"}
                  disabled={!i.enabled}
                  onClick={() => setInstitute(i.value)}
                >
                  {i.label}
                  {!i.enabled && (
                    <Badge variant="secondary" className="ml-2">
                      Coming soon
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Level</p>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <Button
                  key={l.value}
                  type="button"
                  variant={level === l.value ? "default" : "outline"}
                  disabled={!l.enabled}
                  onClick={() => setLevel(l.value)}
                >
                  {l.label}
                  {!l.enabled && (
                    <Badge variant="secondary" className="ml-2">
                      Coming soon
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {level && (
        <Card>
          <CardHeader>
            <StepTitle
              step={2}
              english="Choose a writing task"
              german="Schriftlichen Ausdruck wählen"
            />
          </CardHeader>
          <CardContent className="space-y-2">
            {prompts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading tasks…</p>
            ) : (
              <>
                {prompts.slice(0, visibleCount).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPromptId(p.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedPromptId === p.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{p.title}</p>
                      {p.practice && (
                        <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          Practiced{p.practice.attemptCount > 1 && ` ${p.practice.attemptCount}×`}
                          {" · best "}
                          {p.practice.bestScore}/{p.practice.maxScore}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{p.taskIntro}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.leitpunkte.length} Punkte &middot; {p.minWords}-{p.maxWords} Wörter
                      &middot; {p.register === "SIE" ? "formell (Sie)" : "informell (du)"}
                    </p>
                  </button>
                ))}

                {visibleCount < prompts.length && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  >
                    Show more ({prompts.length - visibleCount} remaining)
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {selectedPrompt && (
        <Card>
          <CardHeader>
            <StepTitle step={3} english="The task" german="Die Aufgabe" />
            <CardDescription>{selectedPrompt.taskIntro}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedPrompt.stimulusText && (
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="whitespace-pre-wrap text-sm">{selectedPrompt.stimulusText}</p>
              </div>
            )}

            <div>
              <p className="text-sm">{selectedPrompt.instructions}</p>
              <ul className="mt-3 space-y-1.5">
                {selectedPrompt.leitpunkte.map((punkt, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-muted-foreground">{i + 1}.</span>
                    <span className="font-medium">{punkt}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">
                {selectedPrompt.register === "SIE" ? "Formell — Sie" : "Informell — du"}
              </Badge>
              {selectedPrompt.requiresSubject && <Badge variant="outline">Betreff nötig</Badge>}
              {selectedPrompt.stimulusAuthor && (
                <Badge variant="outline">Antwort an {selectedPrompt.stimulusAuthor}</Badge>
              )}
              <Badge variant="outline">
                {selectedPrompt.minWords}-{selectedPrompt.maxWords} Wörter
              </Badge>
              {selectedPrompt.timeLimitMinutes && (
                <Badge variant="outline">{selectedPrompt.timeLimitMinutes} Minuten</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPrompt && (
        <Card>
          <CardHeader>
            <StepTitle step={4} english="Write your letter" german="Ihren Brief schreiben" />
            <CardDescription>
              Address all {selectedPrompt.leitpunkte.length} points, and don&apos;t forget a
              salutation and closing.
              {quota && (
                <span className="ml-2">
                  {quota.remaining} of {quota.limit} evaluations left today.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              rows={12}
              placeholder="Schreiben Sie hier Ihren Text..."
              className="resize-y"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <span
                  className={`text-sm ${
                    wordCount < selectedPrompt.minWords || wordCount > selectedPrompt.maxWords
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {wordCount} words
                </span>
                {selectedPrompt.timeLimitMinutes && (
                  <WritingTimer
                    elapsedSeconds={timer.elapsedSeconds}
                    limitMinutes={selectedPrompt.timeLimitMinutes}
                    isRunning={timer.isRunning}
                  />
                )}
              </div>
              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting || wordCount === 0 || (quota ? quota.remaining <= 0 : false)
                }
              >
                {isSubmitting ? "Evaluating…" : "Submit for evaluation"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
