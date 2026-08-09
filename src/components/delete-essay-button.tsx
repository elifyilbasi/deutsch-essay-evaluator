"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Level } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/safeJson";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * What this deletion costs the progress card, as a sentence — or null when it costs it
 * nothing worth naming.
 *
 * Deleting an essay quietly rewrites its level's average, best and pass count, and the
 * dialog used to promise only that the essay and its evaluation were going. A learner
 * tidying up one weak essay could not see that their average was about to move, which is
 * the one consequence they cannot undo and cannot check afterwards.
 *
 * A pure function rather than JSX so the wording is testable without rendering a dialog.
 */
export function progressImpact(
  level: Level,
  /** Null for an essay with no evaluation: there is no score to take out of the card. */
  scorePercent: number | null,
  /** The level's only essay, so deleting it empties the level rather than shifting it. */
  isOnlyAttempt: boolean,
): string | null {
  if (scorePercent === null) return null;
  if (isOnlyAttempt) {
    return `It's your only ${level} essay, so your ${level} progress will go back to empty.`;
  }
  // A zeroed essay needs no branch of its own: its score is 0%, and naming it is if
  // anything more useful, since taking a rule zero out RAISES the average it quotes.
  return `Its ${scorePercent}% will leave your ${level} progress, changing your average and best for that level.`;
}

export function DeleteEssayButton({
  essayId,
  level,
  scorePercent,
  isOnlyAttempt,
}: {
  essayId: string;
  level: Level;
  /**
   * Already a whole percent. Computed by the server component that has the evaluation,
   * because each one carries its own `maxScore` — telc B1 is out of 45 and A2 out of 10,
   * and a client component re-deriving that would be a second place to get it wrong.
   */
  scorePercent: number | null;
  isOnlyAttempt: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const impact = progressImpact(level, scorePercent, isOnlyAttempt);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/essays/${essayId}`, { method: "DELETE" });
      if (!response.ok) {
        toast.error(await errorMessage(response, "Failed to delete essay."));
        return;
      }

      toast.success("Essay deleted.");
      setOpen(false);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete essay">
            <Trash2 />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this essay?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the essay and its evaluation.{" "}
            {impact && `${impact} `}
            This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={handleDelete}>
            {isDeleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
