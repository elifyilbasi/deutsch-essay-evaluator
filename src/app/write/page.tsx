"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskBrief } from "@/components/task-brief";
import { countWords, wordsOutOfRange } from "@/lib/wordCount";
import { MAX_ESSAY_CHARS } from "@/lib/essayLimits";
import { WritingTimer, useWritingTimer } from "@/components/writing-timer";
import { safeJson, errorMessage } from "@/lib/safeJson";
import { reflowSoftWraps } from "@/lib/reflowSoftWraps";
import { NOT_COPYABLE } from "@/lib/examMaterial";
import { cn } from "@/lib/utils";
import { INSTITUTES, LEVELS, parseLevelHint, parseWriteParams } from "@/lib/writeParams";
import type { Institute, Level } from "@/lib/writeParams";
import { TaskPicker } from "@/components/task-picker";
import { buildFacets, filterTasks, type Selection } from "@/lib/taskFilters";
import {
  DraftNotice,
  DraftStatusLine,
  useDraftAutosave,
} from "@/components/draft-autosave";

type PromptSummary = {
  id: string;
  title: string;
  taskIntro: string;
  stimulusText: string | null;
  stimulusAuthor: string | null;
  instructions: string;
  leitpunkte: string[];
  register: "DU" | "SIE";
  /** Why the candidate is writing. Filters the picker; see src/lib/taskFilters.ts. */
  schreibanlass: string;
  requiresSubject: boolean;
  minWords: number;
  maxWords: number | null;
  timeLimitMinutes: number | null;
  /**
   * How many Leitpunkte the level marks, where that is fewer than the task prints.
   * Null when every printed point is required. Attached by the prompts API because
   * the rubrics are server-only — same reason as `timeLimitMinutes`.
   */
  requiredPoints: number | null;
  practice: { attemptCount: number; bestScore: number; maxScore: number } | null;
};

/**
 * How many tasks a level needs before the search box and facet chips are worth their
 * space. Below it the list is short enough to read straight through, and a toolbar
 * would be three controls for filtering eight things.
 *
 * Ten because that is where the old three-at-a-time list started to hurt: A1 seeds
 * eight tasks and is fine as a plain list, while A2's twelve, B1's twenty and B2's
 * thirty-nine are not.
 */
const TOOLBAR_MIN = 10;

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

function WriteWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  /**
   * A revise link, read once. Consumed in the state initialisers below rather than in
   * an effect, so the prompt fetch fires with the right institute/level on the first
   * render and the selection is already in place when the list lands.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const revise = useMemo(() => parseWriteParams(searchParams), []);
  // A bare ?level= link (the progress card's "write one") carries no task, so it is
  // not a revise link — but it should still open the wizard on that level. Read once for
  // the same reason as above: it feeds a state initialiser, not an effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const levelHint = useMemo(() => parseLevelHint(searchParams), []);
  /** Set while the URL still describes the state, so we know to clean it and can tell
   * the user if the task it pointed at has gone. */
  const urlPromptId = useRef<string | null>(revise?.promptId ?? null);

  /** Idempotency key for the current attempt; see handleContentChange. */
  const submissionId = useRef<string | null>(null);
  const [institute, setInstitute] = useState<Institute>(revise?.institute ?? "TELC");
  const [level, setLevel] = useState<Level | null>(revise?.level ?? levelHint);
  const [prompts, setPrompts] = useState<PromptSummary[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(
    revise?.promptId ?? null,
  );
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quota, setQuota] = useState<{ limit: number; remaining: number } | null>(null);
  const [taskQuery, setTaskQuery] = useState("");
  const [taskFilters, setTaskFilters] = useState<Selection>({});
  const [promptsStatus, setPromptsStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  /** Bumped by "Try again" so the fetch effect re-runs. */
  const [reloadNonce, setReloadNonce] = useState(0);
  const timer = useWritingTimer();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const draft = useDraftAutosave({
    userId,
    promptId: selectedPromptId,
    content,
    elapsedSeconds: timer.elapsedSeconds,
    // Text past the submittable limit cannot be sent anyway, so storing it would only
    // spend the storage quota on something unusable.
    enabled: content.length <= MAX_ESSAY_CHARS,
  });

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
          throw new Error("prompts request failed");
        }
        return safeJson<{ prompts: PromptSummary[] }>(r);
      })
      .then((data) => {
        if (cancelled) return;
        const list = data?.prompts ?? [];
        setPrompts(list);
        setPromptsStatus("ready");
        // Prune rather than clear. A selection made before this resolved - from a
        // revise link, say - is legitimate and must survive; one that is not in the
        // list any more (deactivated task, changed level) is the only kind to drop.
        setSelectedPromptId((prev) =>
          prev && list.some((p) => p.id === prev) ? prev : null,
        );

        // A revise link pointing at a task that is gone (deactivated, or a stale
        // link) leaves the user on step 2 with a real list rather than a phantom.
        const fromUrl = urlPromptId.current;
        if (fromUrl && !list.some((p) => p.id === fromUrl)) {
          toast.info("That task isn't available any more — pick another one below.");
          urlPromptId.current = null;
        }
      })
      .catch(() => {
        // Without this the chain rejected unhandled and the card sat on "Loading
        // tasks..." forever - the state simply never moved again.
        if (!cancelled) setPromptsStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [institute, level, reloadNonce]);

  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId) ?? null;
  const wordCount = countWords(content);

  // Built from the tasks this level actually returned, so the controls a learner is
  // offered are the ones that can divide THIS list — B2 gets an Anlass filter, A2 gets
  // Register, B1 gets neither because all twenty of its tasks are the same on both.
  const showToolbar = prompts.length >= TOOLBAR_MIN;
  const facets = useMemo(
    () => (showToolbar ? buildFacets(prompts) : []),
    [prompts, showToolbar],
  );
  const visiblePrompts = useMemo(
    () => (showToolbar ? filterTasks(prompts, taskQuery, taskFilters) : prompts),
    [prompts, taskQuery, taskFilters, showToolbar],
  );

  function resetTaskFilters() {
    setTaskQuery("");
    setTaskFilters({});
  }

  /**
   * Everything that belongs to one attempt, cleared together. Splitting these up is
   * what caused the bugs: `content` used to survive a task switch, so text written
   * for one task was submitted against another, and `submissionId` did too — which
   * since the server started treating it as an idempotency key meant the second
   * submission returned the FIRST essay, sending the user to the wrong feedback page.
   */
  /**
   * Drops the revise params once the user picks something else. Not on arrival: a
   * refresh would then dump them back into an empty wizard. Not never, either — the
   * URL would keep claiming a task they had moved on from, and a refresh would yank
   * them back to it. replaceState rather than router.replace: no navigation, no
   * scroll jump, no RSC round trip.
   */
  function cleanUrlIfDiverged() {
    if (!urlPromptId.current && !revise) return;
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", "/write");
    }
    urlPromptId.current = null;
  }

  function resetAttempt() {
    setContent("");
    timer.reset();
    submissionId.current = null;
  }

  function selectTask(id: string) {
    if (isSubmitting) return;
    if (id === selectedPromptId) return;
    // Flush BEFORE the reset, or switching away from a task discards its draft
    // instead of saving it.
    draft.save();
    cleanUrlIfDiverged();
    resetAttempt();
    setSelectedPromptId(id);
  }

  function selectLevel(next: Level) {
    if (isSubmitting) return;
    if (next === level) return;
    draft.save();
    cleanUrlIfDiverged();
    resetAttempt();
    setLevel(next);
    setSelectedPromptId(null);
    setPromptsStatus("loading");
    // A different level is a different bank, and its facets are built from different
    // tasks — a chip carried over could name a value the new list has none of.
    resetTaskFilters();
  }

  function selectInstitute(next: Institute) {
    if (isSubmitting) return;
    if (next === institute) return;
    draft.save();
    cleanUrlIfDiverged();
    resetAttempt();
    setInstitute(next);
    setSelectedPromptId(null);
    setPromptsStatus("loading");
    resetTaskFilters();
  }

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
      // The attempt is genuinely finished, so the draft has nothing left to protect.
      draft.clear();
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
                  disabled={!i.enabled || isSubmitting}
                  onClick={() => selectInstitute(i.value)}
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
                  disabled={!l.enabled || isSubmitting}
                  onClick={() => selectLevel(l.value)}
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
            {promptsStatus === "loading" ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : promptsStatus === "error" ? (
              <div className="space-y-3 py-2">
                <p className="text-sm text-muted-foreground">
                  Couldn&apos;t load the writing tasks.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPromptsStatus("loading");
                    setReloadNonce((n) => n + 1);
                  }}
                >
                  Try again
                </Button>
              </div>
            ) : prompts.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                No writing tasks for {institute} {level} yet.
              </p>
            ) : (
              <TaskPicker
                tasks={prompts}
                facets={facets}
                visible={visiblePrompts}
                query={taskQuery}
                onQueryChange={setTaskQuery}
                selection={taskFilters}
                onSelectionChange={setTaskFilters}
                selectedId={selectedPromptId}
                onSelect={selectTask}
                disabled={isSubmitting}
                showToolbar={showToolbar}
              />
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
              <div className={cn("rounded-lg border bg-muted/40 p-4", NOT_COPYABLE)}>
                <p className="whitespace-pre-wrap text-sm">
                  {reflowSoftWraps(selectedPrompt.stimulusText)}
                </p>
              </div>
            )}

            <TaskBrief
              instructions={selectedPrompt.instructions}
              leitpunkte={selectedPrompt.leitpunkte}
              register={selectedPrompt.register}
              requiresSubject={selectedPrompt.requiresSubject}
              stimulusAuthor={selectedPrompt.stimulusAuthor}
              minWords={selectedPrompt.minWords}
              maxWords={selectedPrompt.maxWords}
              timeLimitMinutes={selectedPrompt.timeLimitMinutes}
            />
          </CardContent>
        </Card>
      )}

      {selectedPrompt && (
        <Card>
          <CardHeader>
            <StepTitle step={4} english="Write your letter" german="Ihren Brief schreiben" />
            <CardDescription>
              {/* Not "all N points": telc B2 prints four and marks three, one of which may
                  be an aspect of your own — the Aufgabe rendered directly above says so in
                  its entweder/oder line. Telling the candidate to cover all four here
                  contradicted the task they were reading and made a correct letter look
                  short. Levels that do mark every printed point still say "all". */}
              {selectedPrompt.requiredPoints !== null &&
              selectedPrompt.requiredPoints < selectedPrompt.leitpunkte.length
                ? `Address at least ${selectedPrompt.requiredPoints} of the ${selectedPrompt.leitpunkte.length} points — see the entweder/oder line above, which lets you swap one for an aspect of your own. Don't forget a salutation and closing.`
                : `Address all ${selectedPrompt.leitpunkte.length} points, and don't forget a salutation and closing.`}
              {quota && (
                <span className="ml-2">
                  {quota.remaining} of {quota.limit} evaluations left today.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft.offered && (
              <DraftNotice
                draft={draft.offered}
                onRestore={() => {
                  const saved = draft.offered!;
                  setContent(saved.content);
                  // Restores the clock too, but leaves it stopped: it starts again on
                  // the next keystroke, same as a fresh attempt.
                  timer.reset(saved.elapsedSeconds);
                  if (!submissionId.current) submissionId.current = crypto.randomUUID();
                  draft.discard();
                }}
                onDiscard={draft.discard}
              />
            )}

            {/*
              readOnly rather than disabled while the evaluation runs: text typed
              during the call used to be silently dropped from the submission, but a
              disabled textarea also makes the text unselectable, which matters most
              when the request fails and the user wants to copy their work out.
            */}
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              readOnly={isSubmitting}
              aria-busy={isSubmitting}
              rows={12}
              maxLength={MAX_ESSAY_CHARS}
              placeholder="Schreiben Sie hier Ihren Text..."
              className={`resize-y ${isSubmitting ? "opacity-70" : ""}`}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <span
                  className={`text-sm ${
                    wordsOutOfRange(wordCount, selectedPrompt.minWords, selectedPrompt.maxWords)
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
                <DraftStatusLine status={draft.status} />
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

/**
 * useSearchParams needs a Suspense boundary or the whole route opts out of static
 * rendering — it passes `next dev` without one and fails `next build`. Same split as
 * src/app/login/page.tsx.
 */
export default function WritePage() {
  return (
    <Suspense fallback={null}>
      <WriteWizard />
    </Suspense>
  );
}
