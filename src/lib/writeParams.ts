/**
 * The exam options the write wizard offers, and the parsing of a "revise this task"
 * link into them.
 *
 * These lists live here rather than in the page so that both the wizard and the
 * parser read the same source: a link may only preselect something the wizard would
 * actually let you pick, so a level that is not enabled yet cannot be reached by
 * hand-editing a URL.
 */

export type Institute = "TELC" | "GOETHE";
export type Level = "A1" | "A2" | "B1" | "B2";

export const INSTITUTES: { value: Institute; label: string; enabled: boolean }[] = [
  { value: "TELC", label: "TELC", enabled: true },
  { value: "GOETHE", label: "Goethe-Institut", enabled: false },
];

/**
 * Ladder order, and the only levels that will ever ship — C1 is deliberately absent
 * rather than carried as a permanently disabled option. The dashboard's progress grid
 * reads the enabled entries from here too, so what a learner is shown progress for and
 * what they can actually write cannot drift apart.
 */
export const LEVELS: { value: Level; label: string; enabled: boolean }[] = [
  { value: "A1", label: "A1", enabled: true },
  { value: "A2", label: "A2", enabled: true },
  { value: "B1", label: "B1", enabled: true },
  { value: "B2", label: "B2", enabled: true },
];

export type WriteParams = {
  institute: Institute;
  level: Level;
  promptId: string;
};

/** A minimal reader, so this stays testable without a URLSearchParams instance. */
type ParamReader = { get(name: string): string | null };

function enabledValue<T extends string>(
  options: { value: T; enabled: boolean }[],
  raw: string | null,
): T | null {
  // Matched against the option list, never `raw in SomeObject` — the enums are plain
  // objects, so `in` also matches Object.prototype keys and would let
  // ?institute=constructor through. Same reasoning as src/lib/parseEnum.ts.
  const match = options.find((o) => o.value === raw);
  return match && match.enabled ? match.value : null;
}

/**
 * Reads a revise link. All three parts must be present and usable or the whole thing
 * is null and the wizard starts from scratch — a half-valid link should not drop the
 * user somewhere they did not ask to be, and a malformed one is not their fault.
 */
export function parseWriteParams(params: ParamReader): WriteParams | null {
  const institute = enabledValue(INSTITUTES, params.get("institute"));
  const level = enabledValue(LEVELS, params.get("level"));
  const promptId = params.get("promptId");
  if (!institute || !level || !promptId) return null;
  return { institute, level, promptId };
}

/**
 * How many task cards to show so that the one at `index` is among them. A revise
 * link can point at a task sitting past the fold, and step 2 would otherwise
 * highlight nothing while steps 3 and 4 render the task perfectly well.
 */
export function visibleCountFor(index: number, pageSize: number, current = pageSize): number {
  if (index < 0) return current;
  const needed = Math.ceil((index + 1) / pageSize) * pageSize;
  return Math.max(current, needed);
}
