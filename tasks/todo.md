# Align TELC A1 with the official telc grid

Scope confirmed with the user: this project evaluates the **writing task only**.
telc A1 *Schreiben Teil 1* (Formular ausfüllen) is deliberately out of scope; only
*Teil 2* (the short text) is modelled.

## Plan

- [x] Audit the six A1 papers against the implemented A1 rubric and seeds
- [x] Seed papers 02-06, which were on disk but never seeded
- [x] Obtain telc's **actual** A1 assessment criteria rather than approximating them
- [x] Rewrite the A1 rubric to that grid: per-Inhaltspunkt marks + one KG mark, max 10
- [x] Teach the evaluation pipeline per-Inhaltspunkt marking without touching B1
- [x] Widen the score columns to Float (telc A1 awards half marks)
- [x] Verify B1 is bit-for-bit unchanged

## The official grid

Source: telc **Start Deutsch 1 Übungstest 1**, *Informationen für Prüfende → Bewertung* —
the marks two Prüfende enter on the green Antwortbogen S60 as "1-2-3-KG". Summarised
rather than reproduced here; the grid itself stays in the paper, and the band descriptors
the scoring actually needs live in `src/lib/rubrics/telc.ts`.

Two criteria, ten points:

- **Erfüllung der Aufgabenstellung**, marked *per Inhaltspunkt* on a three-value scale —
  full marks (3) for a point handled fully and comprehensibly, half (1,5) where linguistic
  or content problems leave it only partly handled, nothing (0) where it is unhandled or
  incomprehensible.
- **Kommunikative Gestaltung des Texts**, one mark for the whole text on the same
  three-value shape — 1, 0,5 or 0, turning on whether the text carries the conventions of
  its Textsorte at all, the Anrede being the example the paper gives.

Three Inhaltspunkte × 3, plus 1 for KG = 10, which is the stated maximum.

## What the grid does NOT contain

This is where the previous implementation was wrong, and it was wrong in the
learner's disfavour:

- **No formale Richtigkeit criterion.** A1 does not score grammar or spelling on
  their own. They matter only where they push an Inhaltspunkt to "nur teilweise
  erfüllt" or "unverständlich". Corrections are still fed back, never scored.
- **No banding by how many points were covered.** Each Inhaltspunkt is marked on its
  own, so 3 + 1,5 + 0 is a real and common outcome that no A/B/C/D band can express.
- **No Zusatzpunkte** and **no "Thema verfehlt" override** — an off-topic text simply
  earns nothing on the Inhaltspunkte.
- **Half marks.** 1,5 and 0,5 are official values, so scores are not integers.

## Review

**`src/lib/rubrics/types.ts`** — added `ContentPointScoring` (marks per Inhaltspunkt,
keyed by the ADDRESSED/PARTIAL/MISSING status the examiner assigns) and an explicit
`themaVerfehltZeroesTask` flag, so the override is a per-level property instead of a
hardcoded rule. `maxRawScore` now takes the Leitpunkt count, because telc A1's total
depends on how many Inhaltspunkte the task sets. Rubrics without `contentPointScoring`
score exactly as before.

**`src/lib/rubrics/telc.ts`** — A1 rewritten to the grid above and marked
`verified: true`, with the source quoted in full above the definition. A2's header
comment no longer claims to cover A1, and A2 stays `verified: false`.

**`src/lib/gemini.ts`** — the prompt now describes per-Inhaltspunkt marking and tells
the model not to band the content marks; the Zusatzpunkte and Thema-verfehlt steps are
gated on the rubric. The content marks are summed into one leading breakdown line
mirroring telc's own "1-2-3-KG" order; `CriterionScore.band` became optional because
those marks have no band.

**`prisma/schema.prisma`** — `overallScore`, `maxScore`, `rawScore` are `Float`.
`Int` would have silently truncated every half mark.

**`src/components/criteria-breakdown.tsx`** — renders the band pill only when there is
one, and formats marks the way telc writes them ("1,5", not "1.5").

**`prisma/seed-telc-a1.ts`** — all six papers seeded (previously one), sharing a `base`
const. Only paper 01 prints an instruction line and word count, so 02-06 carry an
instruction line that is ours; the file header says so.

### Level separation

B1 was verified untouched rather than assumed untouched: the prompt built for all 17
seeded B1 tasks is **byte-identical to `HEAD`**, as is B1's response schema. B1 still
scores 45/45 at full marks, still zeroes on Thema verfehlt, still has three banded
criteria and no `contentPointScoring`. The shared prompt branches restore B1's original
wording verbatim rather than rephrasing it.

An audit for the reverse leak — B1's rules reaching A1 — found three in the Gemini
**response schema**, which was a module-level constant and therefore identical for every
level. Its `description` fields are instructions in their own right, so each A1 request
carried, alongside a correct A1 prompt, B1's claims that Thema verfehlt "zeroes the whole
letter", that Zusatzpunkte 0-2 were available, and B1's reading of the coverage statuses —
the last being the highest-stakes field at A1, where those statuses *are* the score. The
`band` enum also offered A-D, and a stray D against A1's three-way criterion resolved to
the harshest mark through the `bands.at(-1)` fallback. The schema is now built per rubric
(`buildResponseSchema`), and the enum is derived from the bands the rubric actually
defines.

### Verified

`npx tsc --noEmit`, `npx eslint` and `npx prisma generate` clean. A scratch script
asserted the B1 prompt diff above plus the A1 grid end to end: 10 at full marks,
9,5 / 8,5 / 4,5 / 0 across mixed statuses, half marks surviving unrounded, no
Zusatzpunkte, no Thema-verfehlt override, and an A1 prompt that never mentions formale
Richtigkeit. The app itself was not run — that needs a seeded database and a Gemini key.

### Scope labelling (follow-up)

A real A1 breakdown reading "10 / 10" prompted the question of whether telc A1 is
really a 10-point scale. Re-checking the paper's *Testformat* table confirmed the 10
for Teil 2 and supplied the context that was missing:

    Schreiben Teil 1 (Formular)  5  +  Teil 2  10  =  Prüfungsteil Schreiben  15
    Hören 15 · Lesen 15 · Schreiben 15 · Sprechen 15 = 60, ×1,66 → ~100
    90-100 sehr gut · 80-89 gut · 70-79 befriedigend · 60-69 ausreichend · 0-59 teilgenommen

That table is now recorded above the A1 rubric. Two display fixes followed:

- `LevelRubric` gained `scaleLabel` and `scaleNote`, set per level, so the total is
  captioned with the exam part it covers ("Schreiben, Teil 2") and the sentence
  underneath is the right one for that level.
- The essay page had **hardcoded B1 wording** — "Der Schriftliche Ausdruck zählt N
  Punkte … (60 %)" — rendered for every level, including A1, where both the part name
  and the pass rule are wrong. It now reads `rubric.scaleNote`. B1's string is
  reproduced verbatim, so B1's card is unchanged.
- The totals row says "Punkte" rather than "Rohpunkte" where the multiplier is 1;
  "roh" only means something when a multiplication follows, as at B1 (×3).

## B1 verified against the official grid (step 2) — FOUR DEFECTS FOUND, ALL FIXED

All four are corrected in `src/lib/rubrics/telc.ts`, B1's entry only. A1 and A2 were
not touched: the A1 grid stays exactly as telc defines it for A1, and A2 remains a
flagged stand-in. Verified after the fix:

| Grades | Before | After | Grid |
|---|---|---|---|
| A / A / A | 45 | 45 | 45 |
| A / A / **D** | **0** | **30** | 30 |
| **D** / B / B | **0** | **18** | 18 |
| A / B / B | **45** (bonus) | **33** | 33 |
| Thema verfehlt | 0 | 0 | 0 |


Source: telc Deutsch B1 / Zertifikat Deutsch, **Übungstest 1, überarbeitete Auflage
2019**, *Bewertungskriterien Schriftlicher Ausdruck* + *Berechnung des Teilergebnisses*.

**Confirmed correct:** three criteria (I Aufgabenbewältigung, II Kommunikative
Gestaltung, III Formale Richtigkeit); bands **A=5 B=3 C=1 D=0** for all three;
"diese Punktzahl wird mit drei multipliziert … maximal 45 Punkte"; and Kriterium I's
bands read exactly as we have them (alle vier / drei / zwei / nur ein oder kein
Leitpunkt). The 45 is 15 % of the 300-point exam; passing needs 60 % per Prüfungsteil.

### 1. `zeroesWholeTask` on Kriterium I is wrong — SEVERE

The grid's footnote: *"Ist nur die Situierung verfehlt oder nur ein oder kein Leitpunkt
inhaltlich angemessen bearbeitet, wird zwar Kriterium I auf D gesetzt, aber dennoch die
sprachliche Angemessenheit, d. h. Kriterium II und III, bewertet."*

Only **Thema verfehlt** ("bezieht sich der Text nicht oder kaum auf die
Aufgabenstellung") forces D in all criteria. A D on Kriterium I alone does not.

### 2. `zeroesWholeTask` on Kriterium III is wrong — SEVERE

Stated outright: *"Wird Kriterium III mit D bewertet, können die Kriterien I und II mit
C, B oder A bewertet sein."*

Combined impact: an essay graded I=A, II=A, III=D currently scores **0/45**; the grid
gives it 5+5+0 = 10 × 3 = **30/45**. I=D, II=B, III=B currently scores 0/45; should be
**18/45**. The app is zeroing letters telc would award a third of the marks to.

### 3. Zusatzpunkte are not in the grid — inflates scores

*"Die Punktzahl im Subtest Schriftlicher Ausdruck ist die Summe der Punkte, die für die
drei Kriterien vergeben wurden"* — nothing else. No Zusatzpunkte provision appears
anywhere in the 2019 edition. Our up-to-2 bonus turns a legitimate 13 raw (39/45) into
15 raw (45/45), overstating by up to 6 points on the official scale.

### 4. Kriterium I is stricter than telc, and II demands what telc excludes

*"Ein Leitpunkt gilt als erfüllt, wenn … es sich nur um einen, ggf. nur kurzen, Satz
handelt / er zusammen mit einem zweiten Leitpunkt in nur einem Satz behandelt wird /
bei einer Aufgabenstellung bestehend aus zwei Komponenten oder im Plural nur eine
Antwort formuliert ist."* Our prompt says a point "merely named in passing does not
count" — telc is markedly more generous.

For Kriterium II the task is a persönliche/halbformelle **E-Mail**, and *"daher sind
Textsortenmerkmale des Briefes (Absender, Empfänger, Datum, Betreffzeile) nicht
gefordert."* Our Kriterium II description explicitly requires a **date**. The grid
instead lists concrete rules: A is withheld for missing e-mail Textsortenmerkmale, wrong
or wavering register, Leitpunkte standing unconnected side by side, or sentences
predominantly starting with *Ich*/*Wir*; C or D for grave breaches of Adressatenbezug
and Register, or entirely missing/nonsensical Verknüpfungen. Kriterium III adds *"hier
gilt das Primat der Verständlichkeit"* — Endungs- and Genusfehler weigh less than
Kongruenzfehler.

The 2019 edition also states II and III through CEFR can-do descriptors (A = "B1 gut
erfüllt", B = "B1 erfüllt", C = "A2", D = "A1 oder darunter"), where ours carry the
older "voll angemessen / im Großen und Ganzen angemessen / kaum noch akzeptabel /
insgesamt nicht ausreichend" wording.

### Betreff and Zusatzpunkte (follow-up)

**`requiresSubject` is now decided by Textsorte, not by the paper's advice.** All 17
B1 seeds moved to `false`: telc's B1 criteria set the Textsorte as a persönliche oder
halbformelle E-Mail, for which Absender, Empfänger, Datum and Betreffzeile are "nicht
gefordert", so a missing Betreff must not cost marks — even though most of those
papers tell the candidate to think of one. The single formal B1 task in `seed.ts`
(reply to a Sprachschule, register "SIE", "Sehr geehrte Damen und Herren") keeps
`true`, which is what makes this a context rule rather than a blanket flip. The
prompt no longer says "no Betreff is required" — it says a Betreff is not a required
feature of this Textsorte and marks must not be withheld for its absence, which does
not contradict the transcribed instruction text.

**Zusatzpunkte are gone from the codebase.** Neither official grid provides for them,
so `maxBonusPoints`, `bonusGuidance`, `bonusPointsSuggested`, `bonusJustification`,
`bonusApplied` and the `Evaluation.bonusPoints` column are all removed, along with the
eligibility logic in `scoreFromBands` and the bonus addend in the breakdown UI.

Existing data was checked before dropping the column: 3 evaluations, **0 with a
non-zero bonus**, and all three re-score identically under the corrected rules
(A/B/B → 33, A/A/A → 45, and the A1 row already used the new grid). No re-evaluation
needed, no data lost.

### Leitpunkt threshold + first real end-to-end run

Reading the generated prompt back caught a defect the assertions had missed: B1's
Kriterium I carried telc's generous threshold ("auch wenn es sich nur um einen, ggf.
nur kurzen, Satz handelt"), but the coverage statuses around it still used the
evaluator's stricter generic gloss ("adequate detail" / "too thin"), so a
one-sentence treatment would have been marked PARTIAL and stopped counting —
systematically under-marking a criterion worth a third of B1. `LevelRubric` gained
`leitpunktStatusGuidance`, B1 states its own threshold there, and the schema and
prompt now resolve status wording per level (A1 keeps its `contentPointScoring`
descriptors, A2 falls back to the generic text).

**First run against the real model** (no DB writes; `evaluateEssay` called directly):

| | Result | Detail |
|---|---|---|
| B1, real learner draft | **39/45** | raw 13 = A(5) + A(5) + B(3); 4/4 Leitpunkte ADDRESSED; 8 corrections |
| A1, seeded task | **10/10** | 9/9 content + 1/1 KG; 3/3 Inhaltspunkte; 2 corrections |

What the run proves that no assertion could:

- The model returned **only `kommunikativeGestaltung`** for A1 — it did not invent a
  `leitpunkte` or `formaleRichtigkeit` verdict, which was the specific risk of giving
  A1 a one-criterion grid.
- B1 returned all three keys and the arithmetic matched by hand.
- The generous threshold works: Leitpunkte handled in a single sentence ("Wie man in
  Ihrem Land heiratet", "Ein Treffen vorschlagen") came back ADDRESSED, not PARTIAL.
- Kriterium III = B on a text with 8 corrections, i.e. the Primat der Verständlichkeit
  is being applied rather than error-counting.
- A1 scored 10/10 despite spelling errors ("ich mochte"), which is correct: telc A1
  has no formale-Richtigkeit criterion, so errors are reported and not scored.

Watch item: the model gave B1 Kriterium II an A on a draft where roughly half the
sentences begin with "Ich". telc says to withhold A when sentences "überwiegend" begin
with Ich or Wir, so a human examiner might have given B. The rubric text is right; the
judgement is generous. Worth checking across more samples before tuning on n = 1.

## telc A2 (Start Deutsch 2) — branch feat/telc-a2-evaluator

Source: telc Deutsch A2 (Start Deutsch 2) Übungstest 1, *Informationen für Prüfende →
Bewertung*. The paper self-identifies in telc's exam-family listing as "telc Deutsch A2
(Start Deutsch 2)", distinct from A2+ Beruf and A2 Schule.

**The grid is word-for-word A1's**: Erfüllung der Aufgabenstellung pro Inhaltspunkt
3 / 1,5 / 0, Kommunikative Gestaltung des Texts 1 / 0,5 / 0, "Es können maximal 10
Punkte vergeben werden", marks recorded as 1-2-3-K. No formale-Richtigkeit criterion,
no Zusatzpunkte, no Thema-verfehlt override. The stand-in it replaced had all three,
plus a 15-point scale and B1's 5/3/1/0 bands.

**The task is not A1's.** "Hier finden Sie vier Punkte. Wählen Sie drei aus. Schreiben
Sie zu jedem Punkt ein bis zwei Sätze (circa 40 Wörter)." Four Leitpunkte are printed
and three are marked, so a point the candidate deliberately skips must cost nothing —
and the maximum stays 10, not 13. `ContentPointScoring.counted` carries this; the best
three statuses are the ones that score. A1 leaves `counted` unset and marks every point.

Both seeded A2 prompts told the candidate to write about all four points; their
instructions and word band (35-50, circa 40) are corrected.

### A display bug the end-to-end run caught

Scoring was right from the start, but the criteria breakdown counted all four points:
it rendered "9 / 12 — Erfüllung der Aufgabenstellung (4 Inhaltspunkte)" against a
correct total of 10, because `gemini.ts` had its own copy of the summing logic. Had a
candidate answered all four well it would have shown 12 + 1 = 13 beside a total of 10.
The best-of-N logic now lives once, in `contentPointMarks`, used by both the scorer and
the breakdown. The row reads 9 / 9 (3 Inhaltspunkte), and the skipped point is no
longer described as unerfüllt — it falls outside the count.

### Verified

`tsc`, `eslint` and all three audits clean. Real model runs: A2 10/10 on a text that
answers three of four points and skips "Stefan"; A1 10/10 and B1 39/45 unchanged.

### Tests (finally in the repo)

`npm test` — 34 tests on `node:test`, no new dependency. Three files: each level
against its transcribed grid, level separation, and prompt consistency. The last is
the one that matters most: rather than asserting strings someone remembered to check,
it parses every "N × P = T" the prompt states and requires it to add up *and* to stay
within that rubric's maximum. Three bugs this session had the same shape — the rubric
was corrected and a layer around it was not — and that check catches the shape, not
the instance. Mutation-tested: reintroducing the A2 prompt bug fails it with
"4 × 3 = 12 claims more marks than the rubric's maximum of 10".

### A design critique I withdrew

I argued `counted: 3` sat on the wrong object, since "how many Leitpunkte" is a task
property. Checking the paper again settled it the other way: the Antwortbogen S60 has
exactly three Inhaltspunkt fields ("1-2-3-K") for every A2 paper, so choose-three is
fixed by the exam format at level scale. Moving it to `Prompt` would have meant a
column and a migration for a rule that does not vary per task. What was real is that
*which* three count when a candidate answers all four is our inference, not telc's —
now labelled as such in the rubric comment.

### Verdict handling (tests, round two)

The first test round covered the rubric layer and the outbound prompt, but nothing
tested what the evaluator does with what the model sends *back* — the one layer where
a bug had actually reached a live run. `evaluateEssay` is now split: the network call
stays, and `resultFromVerdict` derives the score and breakdown from a verdict object,
so it can be driven directly with no API key.

12 cases over malformed and surprising responses: an invented criterion key, a missing
verdict, a band letter outside the rubric, an empty coverage list, more coverage
entries than Leitpunkte, and entirely absent arrays. Every case asserts a
self-consistency invariant — the breakdown must sum to the `rawScore` printed beside
it, no line may exceed its own maximum, and no line may have a maximum of zero.

That invariant found a rough edge on its first run: with an empty coverage list a
content row was emitted with a maximum of 0, which the progress bar divides by. I had
initially written the test *around* it, asserting only finiteness. The row is now
omitted when nothing was judged, and the test asserts the invariant instead.

Two behaviours are documented rather than changed, because both are judgement calls
worth making deliberately: a missing criterion verdict and an unknown band letter both
fall back to the rubric's last band, which is the 0-point one. That penalises the
learner for our infrastructure's glitch.

### Golden snapshots + fixtures shared across levels

Two changes against the root pattern — rules being restated downstream of where they
are defined, then drifting.

**Snapshots** (`tests/snapshots/`, six plain-text files): the exact prompt and response
schema each level sends. The structural tests catch a prompt that *contradicts* its
rubric; these catch the other half — a rubric corrected while the prose around it was
not. Every bug of that kind here was invisible in review because the generated text
never appeared in a diff. Now it does, per level, in readable form. A failure is not
automatically a bug: read the diff, and if intended run `npm run test:update` so the
new text is reviewed next to the rubric change that caused it.

Mutation-tested: changing A1's per-Inhaltspunkt marks from 3/1,5 to 4/2 fails 8 tests,
the snapshot among them, with "A2.prompt.txt no longer matches what the code generates".

**Shared fixtures** (`tests/fixtures.ts`): one representative task per level, and
`rubricsUnderTest` iterating the real `telcRubrics` lookup instead of a hand-kept list.
A new level now picks up every structural and snapshot check automatically, and fails
loudly until it has a fixture rather than being silently untested.

### Open

- **The schema change needs applying**: `npx prisma db push`. Not run; it touches the
  user's database. Existing rows widen from Int to Float without loss.
- `verified` is still dead code — declared, set, and read by nothing. A1 is now
  genuinely verified and A2 genuinely is not, so surfacing it is worth more than before.
- A2 remains an invented stand-in reusing the B1 band shape.
- `leitpunkt-coverage.tsx` shows each point's status but not its mark; for A1 that list
  is where the score actually lives, so showing 3 / 1,5 / 0 per point would help.

---

# Close the global ceiling race

`GLOBAL_DAILY_EVAL_LIMIT` is the setting that actually protects the shared Gemini key:
registration is open, so the per-user quota only governs how fast one account burns
through. It was the one limit that could be walked straight past.

## Plan

- [x] Show the race with real concurrent requests before changing anything
- [x] Make the ceiling claim atomic without splitting the count into a second counter
- [x] Keep the no-ceiling path exactly as it was
- [x] Leave a check behind that can be re-run

## The race

The per-user claim has always been one conditional `INSERT … ON CONFLICT DO UPDATE …
WHERE used < limit`: concurrent writers block on the row lock, re-evaluate the `WHERE`
against the updated row, and cannot both take the last slot.

The ceiling had no such row. It was a `SUM(used)` across every user's row, read and then
acted on — the exact check-then-act shape the per-user path was written to avoid. Eight
concurrent requests against three free slots all read the same under-limit total and all
claimed:

```
Global ceiling, 8 users racing for 3 slots
  FAIL  reservations granted: 8, expected 3
  FAIL  evaluations charged: 8, expected 3
  FAIL  refusals blaming the ceiling: 0, expected 5
```

Five paid model calls past a ceiling whose whole job is to stop them, and the overshoot
scales with concurrency rather than being capped at one.

Read-committed is what makes it unfixable in the per-user style: an aggregate cannot see
the uncommitted increments of concurrent transactions on *other* rows, wherever it is
written — including as a subquery inside the claim statement itself. There is no single
row for the racers to queue on.

## Review

**`src/lib/rateLimit.ts`** — the day's reservations now serialise on a transaction-scoped
advisory lock, taken only when a ceiling is configured, with the aggregate and the claim
inside that transaction. Postgres releases it on commit or rollback, so a refusal cannot
strand it. The per-user claim moved unchanged into `claimUserSlot`, which takes a client
so it can run inside the transaction or, when no ceiling is set, directly on `prisma` —
that path issues no lock and behaves exactly as before.

`SUM(used)` stays the only global count. The alternative, a per-day counter row claimed
by the same conditional-update trick, was rejected: it duplicates a number the database
already holds, and claiming two counters needs a compensating decrement when the second
refuses — a new way for the two to disagree, on the path that already refunds duplicate
submissions. Nothing had to change in `releaseEvaluation`, `getUsageToday` or the route.

Serialising is honest about what a global ceiling is — a single point of contention. The
critical section is one indexed aggregate plus one upsert, and submissions arrive at the
rate of people finishing essays.

**`scripts/check-reservation-concurrency.ts`** + `npm run check:concurrency` — the check
the comments in `rateLimit.ts` already claimed existed. Both claims rest on database
semantics no in-process test can show, and `npm test` deliberately runs without a
database, so it lives outside the suite. It fires real concurrent reservations and
asserts the *committed* totals land exactly on the limit: the ceiling case, and the
per-user case as a control that passes before and after. It sets its limits relative to
the day's existing total, so it works against a database with real rows in it, and
deletes its throwaway users in a `finally`.

Verified: the ceiling case fails as above on the previous code and passes now, repeatably;
119 unit tests, `tsc --noEmit` and eslint unchanged; the check leaves no rows behind.

### Open

- The write page shows the per-user quota only. A user refused by the ceiling learns it
  from a 429 at submit time, after writing.
- `releaseEvaluation` takes no lock. It only ever decrements, so it cannot push a count
  past a limit.

---

# Set the ceiling, and stop the key being burned

The API key's Google project has **no billing account** — AI Studio shows "Free tier" and
offers "Set up billing" rather than naming one. Being charged is therefore structurally
impossible, and no code here improves on that. What was left was availability: past the
free tier Google returns 429s, and the app turned those into failed submissions that
still cost the user a daily slot.

## Plan

- [x] Set the ceiling that the previous change made race-free but left inert
- [x] Bound the burst, not just the day — free-tier quotas are per-minute too
- [x] Make a refusal leave no trace, so a burst cannot quietly eat the day
- [x] Stop charging users for our own throttling
- [x] Close the account-farming route the per-user quota assumes is shut

## Review

**Configuration** — `GLOBAL_DAILY_EVAL_LIMIT="100"` and `GEMINI_RPM_LIMIT="5"` in `.env`,
both deliberately conservative starting values. `.env.example` now carries the reasoning:
keep the ceiling at or under **half** the model's published requests-per-day, because
this app counts UTC days and Google resets on its own schedule, so the two windows
overlap and a ceiling of N allows close to 2N inside one of Google's days.

**`RateWindow`** (`prisma/schema.prisma`) — one counter for one named thing in one time
window. The claim is a single conditional upsert whose `CASE` resets the count when the
window has rolled over, so the rate gate is **one row forever**: nothing accumulates,
nothing needs pruning, and concurrent writers serialise on that row exactly as
`claimUserSlot` does. Only the per-IP registration rows accumulate, and the register
route sweeps yesterday's as it goes.

**`src/lib/rateLimit.ts`** — three limits now, claimed cheapest and most protective
first: the minute, then the day across all users, then the user's own quota. A refusal at
any step throws `ReservationRefused`, which rolls the transaction back and is translated
into a return value immediately outside it. That is the point of the throw: a request
turned away for its own quota must not leave a minute of shared capacity spent on
nothing. The advisory lock stays even though the rate gate's row lock would serialise the
ceiling by itself — that would rest on an optional setting being switched on.

**`src/app/api/essays/route.ts`** — three refusals, three messages, because the cures
differ: wait a minute, come back tomorrow, or come back tomorrow having used your own
five. And one exception to the no-refund-on-failure rule: a Google 429, detected by
`isQuotaError` in `gemini.ts`. That rule exists because a failed call still costs the
shared key — which is exactly what a call refused at Google's gate did *not* do, since it
never reached the model. Charging for it would bill the user for our own limits being too
generous.

**`src/app/api/register/route.ts`** — the per-user quota assumes accounts cost something
to make, and they did not. Email is normalised before the uniqueness check, so
`a@b.com` and `A@b.com` are one account rather than two quotas (the unique index is
case-sensitive; `auth.ts` normalises the sign-in lookup to match). Registrations are
throttled per client IP per day, keyed by a **hash** of the address rather than the
address — this table has no business holding personal data. The housekeeping sweep is
wrapped: it runs after the account exists, so a failure there would report a registration
as failed when it had succeeded.

**The new-account share** (`NEW_ACCOUNT_DAILY_LIMIT="20"`) — the answer to the farming
question, and the only control here that bounds the *payoff* rather than raising the
*price*. Every account younger than 24 hours shares one daily allowance, so however many
are minted they draw from that one number and the remaining 80 stay for people who were
here yesterday. A farmed account is always a new account; that is the whole idea.

Deliberately an absolute number rather than a percentage of the ceiling: easier to reason
about, and it still works when no ceiling is configured. Checked under the same advisory
lock as the ceiling, since it is another sum across rows other requests are writing.

Two corrections to the first version of the rule, both about it being wasteful rather
than wrong:

- **It refused newcomers while the day sat idle.** The allowance was enforced against a
  pool with no reference to how busy the day actually was, so the 21st new account was
  turned away with 75 of 100 evaluations unused. It now only bites once the day passes
  half the ceiling (`CEILING_PRESSURE_PERCENT`). Below that line nothing is contended, so
  refusing a real person protects nobody and loses them. With no ceiling configured there
  is no sense of "busy", so the allowance always applies.
- **A handful of accounts drank the whole pool.** First-come-first-served at five each
  meant four accounts emptied a pool of twenty before anyone in another timezone woke up.
  `FIRST_DAY_EVAL_LIMIT="2"` replaces the ordinary quota while an account is new, so the
  same pool now reaches at least ten newcomers and draining it costs ten accounts rather
  than four. Fairness and resistance improved together; the price is that a genuine new
  user writes two essays on day one and five from tomorrow.

Account age is resolved once per reservation (`resolveAccount`) because both rules need
it, and the aggregate is only run for a new account on a contended day — everyone else
spends a primary-key lookup and moves on.

Not done, and the honest limits of all of the above: a proxy pool defeats the IP
throttle, and *patience* defeats the share — accounts registered today are established
tomorrow, which is inherent to any age-based rule. The aim is that farming stops paying
off inside a session, not that it becomes impossible. Making accounts genuinely expensive
needs an identity anchor the app does not have: Google sign-in (Auth.js is already wired
to Prisma, so the provider is a small change) or `emailVerified` gating, which needs an
email sender.

### Verified

`npm run check:concurrency` grew from two cases to eight, all passing repeatably: the
ceiling, the per-user limit, the rate gate, window rollover, the new-account share, the
pressure line, the first-day quota, and "a refusal leaves no trace". The share case checks
both halves of the claim — eight fresh accounts racing take exactly the allowance and no
more, a ninth is refused, and an account registered three days ago is not restricted by
it at all. The pressure case checks the same request being granted below the line and
refused above it, with an empty pool in both. Two of them were wrong before they were right — the rate-gate case failed on a
second run inside the same minute, which was the check being unisolated rather than the
gate being broken, so it now measures relative to what the live minute has spent, the way
the ceiling case already did.

Registration was exercised over HTTP against the dev server: mixed-case address stored
normalised, the lowercase variant correctly refused as a duplicate, malformed address and
malformed body each refused, and the 11th account from one IP refused while the first ten
succeeded. 119 unit tests, `tsc --noEmit` and eslint all clean; the checks leave no rows
behind.

### Open

- **The dev server needs restarting** to pick up the new environment variables and the
  regenerated Prisma client. A server started before this change holds a client with no
  `RateWindow` model.
- The refusal messages were not seen in the browser: reaching them needs a signed-in
  session and an environment change on the running server. The mapping is a static lookup
  in the route; the underlying refusals are covered by the concurrency check.
- `GLOBAL_DAILY_EVAL_LIMIT="100"` and `GEMINI_RPM_LIMIT="5"` are guesses on the safe side
  until the real free-tier numbers for `gemini-flash-latest` are read out of AI Studio.
  They must also be set in the Vercel project, or production stays uncapped.

---

# Google sign-in, in place of email and password

Two things at once. The per-user quota assumes accounts cost something to make, and with
open registration they cost nothing — Google's accounts are not free, because Google gates
them with phone verification at scale. And the credentials path was the un-throttled
bcrypt endpoint: with no password there is nothing to guess, so that closes by deletion
rather than by yet another counter.

## Plan

- [x] Add Google alongside the password form, so a misconfigured client cannot lock anyone out
- [x] Prove the existing account *links* rather than forking
- [x] Only then remove the password path
- [x] Make the entry points say what actually happens

## Review

**The linking is the whole risk.** One account existed, `…@gmail.com`, with 7 essays and no
OAuth account. Auth.js refuses by default to attach a Google identity to an existing user
with the same address (`OAuthAccountNotLinked`), so that person would either be locked out
or silently become a second, empty user with their essays stranded on the first.
`allowDangerousEmailAccountLinking: true` is what avoids that. It is off by default for
good reason — linking on a merely *claimed* address is account takeover — and safe for
this provider specifically because Google verifies the address it returns, which is the
case the flag exists for. It must not be copied onto a provider that does not.

Verified before deleting anything: `provider google | oidc | linked to
cms3ahz4n0000kvjt62l8i09u`, one user row not two, 7 essays still attached.

**Then the removals.** Credentials provider, `/api/register`, `/register`, the Sign up
button, the password form, `bcryptjs`. Auth.js advertises exactly one provider now.

The per-IP registration throttle went with the register route, which is a correction
rather than a loss: it existed to make accounts expensive, and that is Google's job now.
`RateWindow` stays for the rate gate — down to a single row and no index, since nothing
accumulates any more.

**Comments that had become false** were rewritten, in `.env.example` and `rateLimit.ts`:
both argued from "registration is open, accounts are cheap", which stopped being true
with this change. The new-account share cap and `FIRST_DAY_EVAL_LIMIT` stay and still
work — they key off `User.createdAt`, which the adapter sets when it creates the row on
first sign-in.

**Wording.** With OAuth there is no sign-up step, so the three entry points had to stop
disagreeing: the home CTA already said "Get started", while the nav and the login page
said "Log in" — which tells a first-time visitor they need an account they do not have.
Both now say "Sign in", and the page says so explicitly: signing in with Google creates
the account.

`User.passwordHash` is kept and marked vestigial. Dropping a column discards the hashes
irreversibly and it is the only way back if OAuth has to be rolled back.

### Verified

Sign-in linked to the existing user (above). `/register` and `/api/register` return 404,
and `npm run build` confirms both are gone from the route table. Signed out,
`/dashboard`, `/write` and `/essays/*` still redirect to `/login?callbackUrl=…`. 119
tests, `tsc --noEmit`, eslint and `npm run check:concurrency` all green; no console
errors.

Incidental find: `tsc` was failing on `.next/types/validator.ts`, a stale artifact from a
production build dated three weeks earlier. Dev mode never rewrites it, so it would have
failed on any route change since; the build regenerated it.

### Open

- The account-*creation* path is untested end to end — the existing account exercised
  linking, which was the risky half. A second Google account would confirm both the row
  creation and that `FIRST_DAY_EVAL_LIMIT` gives it 2 rather than 5.
- Production needs its own callback URL on the OAuth client
  (`https://<domain>/api/auth/callback/google`) and both variables set wherever it runs.
- `passwordHash` can be dropped once this has proven itself.

## Aufgabe picker: search and self-hiding facets

Step 2 of `/write` revealed three tasks at a time behind "Show more", which is thirteen
presses to reach the end of telc B2's thirty-nine, with no search and no way to see what
was still unpractised.

The obvious fix — group by Textsorte — only works at B2. So grouping is not the
structure. Facets are **derived from the tasks that were loaded**, and one appears only
when at least two of its values cover two tasks each. One code path, no per-level branch:

| Level | Tasks | Toolbar shows |
|---|---|---|
| A1 | 8 | nothing — below `TOOLBAR_MIN`, plain list as before |
| A2 | 12 | Anlass + Register (9 formell / 3 informell) |
| B1 | 20 | search + practice only; all twenty are the same Anlass and register |
| B2 | 39 | Anlass (Beschwerde 23 / Anfrage 9 / Bewerbung 6 / Angebot 1) |

The two-task floor is what keeps B1's lone formal task and A1's lone informal one from
each spawning a filter that isolates one row.

- [x] `Schreibanlass` enum + required `Prompt.schreibanlass`. No `SONSTIGES`: as with
      `Level`'s absent C1, nothing carries a member nothing produces.
- [x] Annotated all 79 seeded tasks from each task's Situierung, not its title — three
      titles name the topic and would have classified wrong (B1 "Beschwerde über einen
      Sprachkurs" is a reply; A2 "Einladung zur Geburtstagsfeier" is a reply to one;
      B2 "Protest gegen den Abriss" says "Beschwerdebrief" outright).
- [x] `src/lib/taskFilters.ts` — `buildFacets`, `filterTasks`, `foldGerman`. Pure.
- [x] `src/components/task-picker.tsx` — toolbar, bounded scroll list, empty state.
- [x] Dropped `PAGE_SIZE`/`visibleCount`/"Show more" and the now-dead `visibleCountFor`.

### Verified

235 tests (17 new in `tests/task-filters.test.ts`, 3 in `seed-bank`), `tsc --noEmit` and
eslint all clean. Driven in the browser at every level: B2 39→6 on one chip and →1 with
`praktikum umwelt`; `beschwerde uber eine radtour` finds `Beschwerde über eine Radtour`,
so the diacritic folding works; A2 shows both facets; B1 shows neither Anlass nor
Register; A1 renders with no toolbar, no chips and no scroll box.

A `?promptId=` revise link naming task 37 of 39 selects it **and** scrolls it into view
inside the box — the deep-link behaviour `visibleCountFor` existed to provide.

Backfill note: the column was added nullable, backfilled for all 79 rows, then made
required. A plain reseed would not have done it — `prisma/seed.ts` withholds updates from
tasks that have essays, and 9 prompts do. That guard protects operator-authored content;
a brand-new classification field has none, so backfilling around it was right.

### Open

- The dev server must be restarted after this lands: a running Next.js process keeps the
  Prisma client it booted with, and the added column 500s until it does.
- `Schreibanlass` is unused outside the picker. If it ever informs marking it needs
  checking against telc's own vocabulary first — it is deliberately *not* Textsorte,
  which the rubrics already fix per level.
