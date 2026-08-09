/**
 * Searching and filtering the writing-task bank.
 *
 * The problem this solves is that the bank is not one size. telc B2 seeds 39 tasks and
 * A1 seeds 8, and what distinguishes one task from another is different at every level:
 * B2 varies its Schreibanlass and never its Register, A2 varies both, B1 varies neither
 * because all twenty are replies to the letter the paper prints.
 *
 * So the controls are not chosen per level — they are derived from the tasks that were
 * actually loaded, and a control that cannot divide the list is not returned at all.
 * That is the whole design: no per-level branch anywhere, and a level whose tasks are
 * uniform simply gets a search box.
 *
 * Pure and free of React so it can be tested directly — same reasoning as
 * src/lib/writeParams.ts and src/lib/progress.ts.
 */

import type { Schreibanlass } from "@/generated/prisma/enums";

export type FacetKey = "anlass" | "register" | "practice";

export type FacetOption = { value: string; label: string; count: number };

export type Facet = { key: FacetKey; label: string; options: FacetOption[] };

/** Chosen values per facet. Absent or empty means "no filter on this facet". */
export type Selection = Partial<Record<FacetKey, string[]>>;

/** The parts of a task this module reads. Kept structural so tests need no fixtures. */
export type TaskLike = {
  title: string;
  taskIntro: string;
  leitpunkte: string[];
  register: "DU" | "SIE";
  schreibanlass: string;
  practice: unknown | null;
};

/**
 * German labels, because these name exam concepts the learner meets in German. The
 * Register wording is the same pair the task card prints, so a chip and the card it
 * filters cannot describe the same task differently.
 *
 * `satisfies` rather than an annotation, and that is the point: it makes the compiler
 * reject this object the moment schema.prisma gains a Schreibanlass with no label here.
 * Annotating it `Record<string, string>` would have accepted anything, and the missing
 * label would have surfaced as a chip reading BESCHWERDE at a learner.
 */
export const ANLASS_LABELS = {
  BESCHWERDE: "Beschwerde",
  ANFRAGE: "Anfrage",
  BEWERBUNG: "Bewerbung",
  ANGEBOT: "Angebot",
  ENTSCHULDIGUNG: "Entschuldigung",
  MITTEILUNG: "Mitteilung",
  ANTWORT: "Antwort",
} satisfies Record<Schreibanlass, string>;

/**
 * The label for an Anlass, falling back to the raw value.
 *
 * The widening is here and nowhere else. `TaskLike.schreibanlass` is a plain string by
 * design — it keeps this module structural, so a test can build a task without importing
 * a generated enum — which leaves exactly one place needing to index the labels with a
 * string. The fallback covers a row rendered from data older than the label map; the
 * `satisfies` above is what makes that unreachable for anything the schema defines.
 */
export function anlassLabel(value: string): string {
  return (ANLASS_LABELS as Record<string, string>)[value] ?? value;
}

/** Also printed on the task card, so a chip and the row it filters cannot disagree. */
export const REGISTER_LABELS: Record<string, string> = {
  SIE: "formell (Sie)",
  DU: "informell (du)",
};

const PRACTICE_LABELS: Record<string, string> = {
  unpractised: "noch nicht geübt",
  practised: "geübt",
};

/**
 * How many tasks a value must cover before it can bring a facet into existence.
 *
 * Two, not one, and the difference is the whole point. B1's twenty tasks are all
 * ANTWORT except the single formal reply to a Sprachschule, and A1's eight are all
 * "Sie" except one note to a friend. A rule of "more than one distinct value" would
 * hand both levels a filter whose only job is to isolate one task — a control that
 * looks like a way to narrow the list and is really a rounding error.
 *
 * It gates whether the facet APPEARS, not which options it shows. Once a facet is
 * worth showing, every value it has is listed, singletons included: dropping a chip
 * would make its tasks reachable only by clearing the filter, and the counts would
 * stop adding up to what the list says it holds.
 */
const MIN_OPTION_COUNT = 2;

/**
 * The floor does not apply to the practice facet, and the reason is that its values are
 * not of the same kind as the others'.
 *
 * An Anlass or a Register with one task behind it is an outlier in the bank — a quirk of
 * what happens to have been transcribed. "Practised" with one task behind it is not a
 * quirk of anything: it is a learner who has started, and the split they most want is
 * exactly the one between the task they have done and the thirty-eight they have not.
 * Holding that filter back until a second attempt withheld it for the whole of the period
 * it was most useful.
 */
const MIN_PRACTICE_COUNT = 1;

/** The three axes, each a way of reading one value off a task. */
const FACETS: {
  key: FacetKey;
  label: string;
  labels: Record<string, string>;
  of: (t: TaskLike) => string;
  /** Tasks a value needs before it counts towards bringing this facet into existence. */
  minCount: number;
}[] = [
  {
    key: "anlass",
    label: "Anlass",
    labels: ANLASS_LABELS,
    of: (t) => t.schreibanlass,
    minCount: MIN_OPTION_COUNT,
  },
  {
    key: "register",
    label: "Register",
    labels: REGISTER_LABELS,
    of: (t) => t.register,
    minCount: MIN_OPTION_COUNT,
  },
  {
    key: "practice",
    label: "Geübt",
    labels: PRACTICE_LABELS,
    of: (t) => (t.practice ? "practised" : "unpractised"),
    minCount: MIN_PRACTICE_COUNT,
  },
];

/**
 * The facets worth showing for this particular set of tasks, in the order above.
 *
 * A facet survives only if at least two of its values clear its own `minCount`. Options
 * come back in descending count so the chip a learner most likely wants is first, with
 * ties broken by label so the order is stable between renders.
 */
export function buildFacets(tasks: TaskLike[]): Facet[] {
  const facets: Facet[] = [];

  for (const facet of FACETS) {
    const counts = new Map<string, number>();
    for (const task of tasks) {
      const value = facet.of(task);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    const substantial = [...counts.values()].filter((n) => n >= facet.minCount).length;
    if (substantial < 2) continue;

    const options = [...counts.entries()]
      .map(([value, count]) => ({ value, label: facet.labels[value] ?? value, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "de"));

    facets.push({ key: facet.key, label: facet.label, options });
  }

  return facets;
}

/**
 * Casefold for searching: lowercase, then strip the diacritics a learner typing on a
 * non-German keyboard will not produce.
 *
 * "ue" for "ü" is deliberately NOT handled. Folding both directions needs a dictionary
 * — "Steuer" is not "Steüer", and "Abenteuer" is not "Abentüer" — and guessing wrong
 * makes a search silently miss tasks, which is worse than asking for the plain vowel.
 * Stripping to the bare letter covers the common case: "uber" finds "über".
 *
 * ß folds to "ss" rather than being stripped, because that is what it is: "grusse"
 * and "grüsse" both reach "Grüße".
 */
export function foldGerman(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    // Combining marks, which NFD has just split off from ä/ö/ü and anything accented.
    .replace(/[̀-ͯ]/g, "");
}

/** Every field worth searching, folded once per task rather than once per query term. */
function haystack(task: TaskLike): string {
  return foldGerman([task.title, task.taskIntro, ...task.leitpunkte].join(" "));
}

/**
 * Tasks matching both the query and the selection.
 *
 * AND across facets, OR within one — the reading that makes chips behave the way a
 * learner expects: picking Beschwerde and Anfrage widens the list, picking Beschwerde
 * and "noch nicht geübt" narrows it.
 *
 * The query is split on whitespace and every term must appear somewhere in the task,
 * so "praktikum umwelt" finds the task neither word alone pins down. Terms match
 * anywhere in the text, not just at a word boundary, which is what makes a query work
 * against German compounds — "kurs" finds "Sprachkurs".
 */
export function filterTasks<T extends TaskLike>(
  tasks: T[],
  query: string,
  selection: Selection,
): T[] {
  const terms = foldGerman(query).split(/\s+/).filter(Boolean);
  const active = FACETS.filter((f) => (selection[f.key]?.length ?? 0) > 0);

  return tasks.filter((task) => {
    if (!active.every((f) => selection[f.key]!.includes(f.of(task)))) return false;
    if (terms.length === 0) return true;
    const text = haystack(task);
    return terms.every((term) => text.includes(term));
  });
}

/** Whether any control is doing something, i.e. whether "reset" has work to do. */
export function hasActiveFilters(query: string, selection: Selection): boolean {
  return query.trim().length > 0 || Object.values(selection).some((v) => v && v.length > 0);
}

/** Adds or removes one value, leaving the other facets alone. */
export function toggleFacetValue(
  selection: Selection,
  key: FacetKey,
  value: string,
): Selection {
  const current = selection[key] ?? [];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  return { ...selection, [key]: next };
}
