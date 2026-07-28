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

From the telc **Start Deutsch 1 Übungstest 1**, *Informationen für Prüfende →
Bewertung*: the marks two Prüfende enter on the green Antwortbogen S60 as "1-2-3-KG".
"Es können maximal 10 Punkte vergeben werden."

| Erfüllung der Aufgabenstellung (pro Inhaltspunkt) | |
|---|---|
| 3 | Aufgabe voll erfüllt und verständlich |
| 1,5 | Aufgabe wegen sprachlicher und inhaltlicher Mängel nur teilweise erfüllt |
| 0 | Aufgabe nicht erfüllt und/oder unverständlich |

| Kommunikative Gestaltung des Texts | |
|---|---|
| 1 | der Textsorte angemessen |
| 0,5 | untypische oder fehlende Wendungen, z. B. keine Anrede |
| 0 | keine textsortenspezifischen Wendungen |

Three Inhaltspunkte × 3, plus 1 for KG = 10.

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

### Open

- **The schema change needs applying**: `npx prisma db push`. Not run; it touches the
  user's database. Existing rows widen from Int to Float without loss.
- `verified` is still dead code — declared, set, and read by nothing. A1 is now
  genuinely verified and A2 genuinely is not, so surfacing it is worth more than before.
- A2 remains an invented stand-in reusing the B1 band shape.
- `leitpunkt-coverage.tsx` shows each point's status but not its mark; for A1 that list
  is where the score actually lives, so showing 3 / 1,5 / 0 per point would help.
