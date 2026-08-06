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
