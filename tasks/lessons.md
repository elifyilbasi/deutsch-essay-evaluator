# Lessons

Patterns to avoid repeating. Reviewed at session start.

## Layout: the user wants the allocated width used

**Correction (2026-08-05):** On the essay feedback page I had capped prose at
`max-w-[70ch]` for readability. When asked "why don't you use the whole row?", I moved
the cap from the text onto the `Card` — still leaving half the shell empty. The user
had to ask twice, more directly: use 100% of the allocated width.

**Why:** A typographic argument (~70 characters is the readable measure) is a real one,
but it was not the user's question. They were reporting that the page looks wrong, and
"narrow the card instead of the text" was still a version of the answer they had already
rejected. Offering the readable-measure option once is fine; re-proposing a variant of it
after they push back is re-litigating a decision they made.

**How to apply:** On this project, the `max-w-6xl` shell in `src/app/layout.tsx` is the
allocated width — page content is expected to fill it. Don't add inner `max-w-*` caps to
prose without being asked. When the user reports a layout as "weird", treat their stated
preference as the requirement, not as an opening position to negotiate against.

## "Fill the width" never means "flatten the structure"

**Guidance (2026-08-06):** Asked to make the hard-wrapped exam texts fill their card, the
instruction was: make it look good *"until it isn't losing any context or meaning."*

**Why:** Both naive fixes lose something. Honouring every newline (`whitespace-pre-wrap`
on raw seed text) freezes an advert at the width of the source file. Collapsing every
newline (a plain `<p>`, which is what `TaskBrief` did to `instructions`) ran the telc
a)/b) options together and destroyed the choice being offered. The seed files' newlines
are two different things wearing the same character.

**How to apply:** `src/lib/reflowSoftWraps.ts` separates them — a break is a soft wrap
only if the line above it reached the wrap column, with guards for list markers and
colon-introduced blocks. Distinguish soft wraps from structural breaks by *line length*,
never by punctuation or capitalisation: German capitalises every noun, and a wrap lands
wherever the margin falls, including after a full stop. Verify a text transform by
running it over the whole seed bank and counting what disappeared, not on one fixture.

## Scoring rules the UI has to repeat, and the "artifact" excuse

**Correction (2026-08-07):** Two mistakes in one exchange. (1) The user showed a
screenshot reading "Address all 4points" and I explained the *rule* was wrong but called
the missing space a rendering artifact because the JSX source had a space. It was real —
a JSX text run that wraps to a new line straight after an expression loses its leading
space, which was also producing "mindestens 150Wörter" elsewhere. (2) After I explained
that a `Missing` chip on a surplus Leitpunkt costs no marks, the user pushed back: the
page still *says* the letter failed a point while its own heading says the task is
complete. Explaining why the score is right did not answer that.

**Why:** "The source looks correct, so the screenshot must be lying" inverts the
evidence — the rendered DOM is the fact, the source is the hypothesis. And a correct
score does not license misleading presentation: a red ✗ under "3 of 3 required points
fully covered" is the page contradicting itself, whatever the arithmetic underneath.

**How to apply:** When a screenshot disagrees with the source, read the live DOM
(`javascript_tool` returning `textContent`) before calling anything an artifact. Build
meta lines as one joined string rather than interleaving `{expr}` with wrapped text.
Where a level asks for fewer points than it prints — telc B2 marks three of four and A2
marks the best three — every surface has to agree: the count, the per-row badge *and*
the score. `src/lib/coverageDisplay.ts` holds that rule now; the scoring side already
had it in `contentPointMarks` and `scoreFromBands`.

## A score is evidence of nothing until it is reproducible

**Correction (2026-08-07):** The user fed in a B2 letter they had deliberately salted
with nonsense vocabulary ("ein Abitur, mit dem geleistete Nachts verrechnet werden",
"Über eine ausführliche Schule") and meaning-inverting negations ("beruflich niemals
unterwegs", "keine Pakete anzunehmen"). It came back 45/45 with an empty corrections
list. Worse, I had quoted that same 45/45 back to them as evidence a display fix was
correct, without once asking whether the mark itself was defensible.

**Why:** `evaluateEssay` set no temperature, so marking ran at the model's default
sampling. Re-running the identical prompt on the identical text gave 33/45 with every
planted error caught. The grader was a coin toss, and its failure mode is the harmful
direction — telling a learner their broken sentence is flawless.

**How to apply:** `temperature: 0` in the `generateContent` config; marking is not a
creative task and variance there is pure loss. When a mark looks wrong, reproduce it
with `npm run evaluate -- --essay f.txt --task t.json` before theorising — the same
call the API route makes, and `--dry-run` prints the prompt for free. Never cite a
model's own output as evidence that something else is right. And when a rubric is
corrected, grep `buildPrompt` for the old reading: the B2 step list was still ordering
a *holistic* Kriterium I long after the rubric was fixed to count, so one prompt said
"count" twice and "NOT a count" last. `tests/snapshots/` exists to make exactly that
visible in a diff.

## The order of the steps in a prompt is load-bearing

**Correction (2026-08-07):** Told that temperature alone had not fixed the marking, the
user re-sent the letter with more damage — "Möbel für Gott aufgebaut", "unterwegs and
allein", "Hilfe bei der Hausaufgaben", mowing a lawn "im Winter" — and still got 33/45
with the summary opening "Your letter shows good structural awareness".

**Why:** `buildPrompt` asked for the bands at step 3 and the corrections at step 4. The
model therefore committed to "recht gute Beherrschung der Grammatik" *before* it had
looked for a single error, and nothing downstream could revise it. The corrections list
and the bands were two independent opinions about the same text, free to contradict each
other — and they did, in the direction that flatters.

**How to apply:** Find the errors first, then band, then say the bands must be consistent
with what was found — telc's own wording already does the work ("nur wenige systematische
Fehler, **die das Verständnis nicht gefährden**" is unavailable once you have listed
errors that do). Name the failure modes concretely in the prompt: wrong-word-in-context,
inverted negation, self-contradiction, foreign word left in. Same text, same model:
33/45 → 15/45 with all ten errors named. When tightening a grader, always re-run a
*clean* answer too — the corrected letter still scored 45/45 with no corrections, and an
A1 answer still scored 10/10, which is what tells you the change discriminates rather
than merely punishes.
