"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { anchorCorrections } from "@/lib/anchorCorrections";
import type { AnchoredCorrection } from "@/lib/anchorCorrections";
import type { Correction } from "@/lib/gemini";

/**
 * Uses <span>s rather than <p>s: this renders inside the essay text, and a <p> nested
 * in a <p> is invalid HTML that the browser silently un-nests, breaking hydration.
 */
function CorrectionDetail({ correction }: { correction: AnchoredCorrection }) {
  return (
    <>
      <span className="block text-destructive line-through decoration-destructive/60">
        {correction.original}
      </span>
      <span className="mt-1 block font-medium text-success">{correction.corrected}</span>
      <span className="mt-1 block text-muted-foreground">{correction.explanation}</span>
    </>
  );
}

/**
 * A correction marked in the text, with its explanation in a card anchored beneath it.
 *
 * The mark is a <span>, never a <button>: a correction can span a hard line break, and
 * a button box is atomic — it refuses to split across lines and floats out of the
 * paragraph instead. Only a true inline element re-flows like a marker pen. That means
 * the button behaviour (focusability, Enter/Space, aria-expanded) is supplied here.
 */
function CorrectionMark({
  text,
  correction,
  isOpen,
  onToggle,
  onClose,
}: {
  text: string;
  correction: AnchoredCorrection;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const markRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLSpanElement>(null);
  const [offset, setOffset] = useState<{
    left: number;
    top: number;
    /** Reflected onto the card as data-placement, so the flip is assertable. */
    placement: "above" | "below";
  } | null>(null);

  // Position the card against the mark, clamped to the paragraph so a correction near an
  // edge doesn't push the card out of view. Measured after paint because it depends on
  // the laid-out position of a mark that may wrap across lines.
  useLayoutEffect(() => {
    if (!isOpen) return;

    const measure = () => {
      const mark = markRef.current;
      const card = cardRef.current;
      const container = mark?.offsetParent as HTMLElement | null;
      if (!mark || !card || !container) return;

      const markBox = mark.getBoundingClientRect();
      const containerBox = container.getBoundingClientRect();
      const cardWidth = card.offsetWidth;
      const cardHeight = card.offsetHeight;

      // Prefer left-aligned with the mark; pull back if it would overflow the right.
      const rawLeft = markBox.left - containerBox.left;
      const maxLeft = Math.max(0, container.clientWidth - cardWidth);

      // Below the mark by default, above it when there is no room left below.
      //
      // The paragraph is the boundary because the Card wrapping it sets overflow-hidden,
      // so anything reaching past the text is not merely awkward, it is cut off — which
      // is what a correction on the closing line did: the mark opened a card that hung
      // below the last line of the essay and lost its lower half, the corrected text
      // among it. Flipping keeps the card inside the element it is measured against, so
      // it does not depend on an ancestor choosing not to clip.
      const below = markBox.bottom - containerBox.top + 6;
      const fitsBelow = below + cardHeight <= container.clientHeight;
      // Clamped at 0 rather than allowed to go negative: with a card taller than the
      // text above the mark, overlapping the text is recoverable and disappearing off
      // the top is not.
      const above = Math.max(0, markBox.top - containerBox.top - cardHeight - 6);

      setOffset({
        left: Math.min(Math.max(0, rawLeft), maxLeft),
        top: fitsBelow ? below : above,
        placement: fitsBelow ? "below" : "above",
      });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isOpen]);

  // Dismiss on outside click, matching what a popover is expected to do.
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (markRef.current?.contains(target) || cardRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen, onClose]);

  return (
    <>
      <span
        ref={markRef}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label={`Correction: ${correction.original}`}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          } else if (event.key === "Escape" && isOpen) {
            onClose();
          }
        }}
        className={`cursor-pointer rounded-sm underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
          isOpen ? "bg-warning/25 decoration-warning" : "decoration-warning/70 hover:bg-warning/15"
        }`}
      >
        {text}
      </span>

      {isOpen && (
        <span
          ref={cardRef}
          role="dialog"
          aria-label={`Correction detail: ${correction.original}`}
          data-placement={offset?.placement}
          // `absolute` inside the relatively-positioned paragraph, so it scrolls with
          // the text rather than detaching the way a fixed-position layer would.
          className="absolute z-20 block w-72 max-w-[calc(100%-1rem)] rounded-lg bg-popover p-3 text-sm whitespace-normal shadow-md ring-1 ring-foreground/10"
          style={{
            left: offset?.left ?? 0,
            top: offset?.top ?? 0,
            visibility: offset ? "visible" : "hidden",
          }}
        >
          <CorrectionDetail correction={correction} />
        </span>
      )}
    </>
  );
}

/**
 * The student's essay with each correction marked where it actually occurs, and its
 * explanation anchored directly beneath the mark. Corrections the matcher couldn't
 * place fall back to a list underneath.
 */
export function AnnotatedEssay({
  essay,
  corrections,
}: {
  essay: string;
  corrections: Correction[];
}) {
  const { segments, unanchored } = anchorCorrections(essay, corrections);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {/*
        A <div>, not a <p>: the correction cards render inline with the text and carry
        their own block-level children, which a paragraph may not legally contain.
        `relative` makes this the positioning context the cards measure against.
      */}
      <div className="relative text-sm leading-7 whitespace-pre-wrap">
        {segments.map((segment, i) =>
          segment.kind === "text" ? (
            <span key={i}>{segment.text}</span>
          ) : (
            <CorrectionMark
              key={i}
              text={segment.text}
              correction={segment.correction}
              isOpen={openIndex === segment.correction.index}
              onToggle={() =>
                setOpenIndex((current) =>
                  current === segment.correction.index ? null : segment.correction.index,
                )
              }
              onClose={() => setOpenIndex(null)}
            />
          ),
        )}
      </div>

      {unanchored.length > 0 && (
        <div className="rounded-lg border border-dashed p-3">
          <p className="text-xs text-muted-foreground">
            {unanchored.length} further{" "}
            {unanchored.length === 1 ? "correction" : "corrections"} couldn&apos;t be
            matched to an exact spot in your text:
          </p>
          <ul className="mt-2 space-y-2">
            {unanchored.map((correction) => (
              <li key={correction.index} className="text-sm">
                <CorrectionDetail correction={correction} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
