"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
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

export function DeleteEssayButton({ essayId }: { essayId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
            This will permanently delete the essay and its evaluation. This can&apos;t be
            undone.
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
