import type { EssayStatus } from "@/generated/prisma/client";

/**
 * What an essay's state actually is, as opposed to what its `status` column says.
 *
 * "Evaluated" is not a stored fact — it is `evaluation != null`. It used to be BOTH,
 * written into `Essay.status` as well, and the two could disagree: an essay whose
 * evaluation row was gone still claimed EVALUATED and rendered an "Evaluated" badge
 * over a page saying it had never been evaluated.
 *
 * So the column now carries only what cannot be derived — whether the essay was ever
 * submitted — and this function is the single place that decides what to show.
 */
export type DisplayStatus = "draft" | "submitted" | "evaluated";

export function displayStatus(essay: {
  status: EssayStatus;
  hasEvaluation: boolean;
}): DisplayStatus {
  // The evaluation row wins over the column in every case. A row that exists means
  // the work was done and paid for, whatever the column was left saying.
  if (essay.hasEvaluation) return "evaluated";
  if (essay.status === "DRAFT") return "draft";
  // SUBMITTED without an evaluation is a real, legitimate state: the essay was saved
  // before the model call, and either that call failed or its result never landed.
  return "submitted";
}

/** True where the essay is waiting on an evaluation that never arrived. */
export function needsEvaluation(essay: {
  status: EssayStatus;
  hasEvaluation: boolean;
}): boolean {
  return displayStatus(essay) === "submitted";
}
