"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/safeJson";

/**
 * The way back for an essay that was saved but never scored.
 *
 * Shown only where there is no evaluation, so it is never a "score this again" button:
 * re-running a verdict is a different feature with a different cost question.
 */
export function EvaluateEssayButton({ essayId }: { essayId: string }) {
  const router = useRouter();
  const [isEvaluating, setIsEvaluating] = useState(false);

  async function handleEvaluate() {
    setIsEvaluating(true);
    try {
      const response = await fetch(`/api/essays/${essayId}/evaluate`, {
        method: "POST",
      });
      if (!response.ok) {
        toast.error(
          await errorMessage(response, "We couldn't evaluate your essay right now."),
        );
        return;
      }
      toast.success("Essay evaluated.");
      router.refresh();
    } finally {
      setIsEvaluating(false);
    }
  }

  return (
    <Button type="button" onClick={handleEvaluate} disabled={isEvaluating}>
      <Sparkles />
      {isEvaluating ? "Evaluating…" : "Evaluate now"}
    </Button>
  );
}
