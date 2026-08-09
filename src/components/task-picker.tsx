"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatWordRange } from "@/lib/wordCount";
import {
  anlassLabel,
  REGISTER_LABELS,
  hasActiveFilters,
  toggleFacetValue,
  type Facet,
  type Selection,
  type TaskLike,
} from "@/lib/taskFilters";

/**
 * The task bank in step 2 of the write wizard: a search box, whichever facet chips this
 * level's tasks actually support, and the matching tasks.
 *
 * It shows every match rather than paging. The list it replaced revealed three tasks at
 * a time, which is thirteen presses of "Show more" to reach the end of telc B2's
 * thirty-nine — and paging was never what made the bank navigable anyway, since a
 * learner looking for a Bewerbung does not want the fourth task, they want the six that
 * are Bewerbungen. Searching and filtering answer that; the scroll box only keeps the
 * card from growing to the height of the whole bank.
 */

/** A task as this component needs it — the filter fields plus what the card prints. */
export type PickerTask = TaskLike & {
  id: string;
  minWords: number;
  maxWords: number | null;
  practice: { attemptCount: number; bestScore: number; maxScore: number } | null;
};

export function TaskPicker({
  tasks,
  facets,
  visible,
  query,
  onQueryChange,
  selection,
  onSelectionChange,
  selectedId,
  onSelect,
  disabled,
  /** Whether the toolbar is worth its space at all — see TOOLBAR_MIN in the wizard. */
  showToolbar,
}: {
  tasks: PickerTask[];
  facets: Facet[];
  visible: PickerTask[];
  query: string;
  onQueryChange: (q: string) => void;
  selection: Selection;
  onSelectionChange: (s: Selection) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled: boolean;
  showToolbar: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // A "revise this task" link can name a task far down the bank. Scrolling it into view
  // is what the old fold-expanding `visibleCountFor` was for: without it step 2 marks a
  // task as chosen somewhere outside the scroll box while steps 3 and 4 render it
  // perfectly well, and the learner is shown a task they cannot see they picked.
  useEffect(() => {
    if (!selectedId) return;
    const row = listRef.current?.querySelector(`[data-task-id="${CSS.escape(selectedId)}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const filtering = hasActiveFilters(query, selection);

  return (
    <div className="space-y-3">
      {showToolbar && (
        <div className="space-y-3">
          <Input
            type="search"
            value={query}
            disabled={disabled}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Aufgaben durchsuchen …"
            aria-label="Aufgaben durchsuchen"
          />

          {facets.map((facet) => (
            <div key={facet.key} className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{facet.label}</span>
              {facet.options.map((option) => {
                const on = selection[facet.key]?.includes(option.value) ?? false;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={on ? "default" : "outline"}
                    disabled={disabled}
                    aria-pressed={on}
                    onClick={() =>
                      onSelectionChange(toggleFacetValue(selection, facet.key, option.value))
                    }
                  >
                    {option.label}
                    <span className="ml-1.5 text-xs opacity-70">{option.count}</span>
                  </Button>
                );
              })}
            </div>
          ))}

          <p className="text-xs text-muted-foreground">
            {/* One string rather than interleaved JSX — see the note on the meta line
                below, which this has the same wrapping hazard as. */}
            {filtering
              ? `${visible.length} von ${tasks.length} Aufgaben`
              : `${tasks.length} Aufgaben · ${tasks.filter((t) => !t.practice).length} noch nicht geübt`}
          </p>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Keine Aufgabe passt zu dieser Suche.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => {
              onQueryChange("");
              onSelectionChange({});
            }}
          >
            Filter zurücksetzen
          </Button>
        </div>
      ) : (
        <div
          ref={listRef}
          // Bounded so thirty-nine tasks do not push step 3 off the screen, but only
          // when there are enough to need it — a short list should not sit in a box
          // that looks like it is hiding something.
          className={showToolbar ? "max-h-[30rem] space-y-2 overflow-y-auto pr-1" : "space-y-2"}
        >
          {visible.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              selected={selectedId === task.id}
              disabled={disabled}
              onSelect={onSelect}
              showAnlass={facets.some((f) => f.key === "anlass")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  selected,
  disabled,
  onSelect,
  /**
   * Only where the Anlass facet is shown. At B1 every task is an Antwort, and a badge
   * that reads the same on all twenty rows is decoration that costs a line of height.
   */
  showAnlass,
}: {
  task: PickerTask;
  selected: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
  showAnlass: boolean;
}) {
  return (
    <button
      type="button"
      data-task-id={task.id}
      onClick={() => onSelect(task.id)}
      disabled={disabled}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{task.title}</p>
        {task.practice && (
          <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
            Practiced{task.practice.attemptCount > 1 && ` ${task.practice.attemptCount}×`}
            {" · best "}
            {task.practice.bestScore}/{task.practice.maxScore}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{task.taskIntro}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {showAnlass && (
          <Badge variant="secondary">
            {anlassLabel(task.schreibanlass)}
          </Badge>
        )}
        {/* Built as one string rather than interleaved JSX: a text run that
            wraps to a new line straight after an expression loses its leading
            space, which is how this rendered "mindestens 150Wörter". */}
        <p className="text-xs text-muted-foreground">
          {[
            `${task.leitpunkte.length} Punkte`,
            `${formatWordRange(task.minWords, task.maxWords)} Wörter`,
            REGISTER_LABELS[task.register],
          ].join(" · ")}
        </p>
      </div>
    </button>
  );
}
