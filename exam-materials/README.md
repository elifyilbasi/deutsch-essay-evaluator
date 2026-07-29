# Exam source material

Drop official exam papers here (PDF, PNG, JPG), sorted by institute and level:

```
exam-materials/telc/b1/   <- TELC B1 Übungstests
exam-materials/telc/a2/
exam-materials/telc/a1/
exam-materials/telc/b2/
exam-materials/goethe/
```

These files are **gitignored** — they are reference material for shaping prompts and
rubrics, not app content. Only this README and the folder structure are committed.

## Naming convention

The folder path already encodes institute and level, so the filename only has to say
**which source** the paper came from and **which one** it is:

```
<source>-<nn>.pdf
```

```
exam-materials/telc/b1/telc-uebungstest-01.pdf     official telc practice test
exam-materials/telc/b1/telc-uebungstest-02.pdf
exam-materials/telc/b1/modellsatz-01.pdf           a publisher's mock paper
exam-materials/telc/b1/kursbuch-schubert-01.pdf    task lifted from a coursebook
```

Zero-pad the number (`01`, not `1`) so they sort correctly once you have ten or more.
Screenshots work just as well as PDFs — same convention, e.g. `telc-uebungstest-03.png`.

`example1.pdf` is honestly fine too; nothing breaks. The convention just stops the folder
becoming unreadable at twenty files.

## What helps most when handing files over

Filenames matter less than two things:

1. **Where the writing task is.** A full paper runs 40-60 pages and only two or three of
   them are the Schriftlicher Ausdruck. Telling me "task on p. 12, Bewertungskriterien on
   p. 41" saves reading the whole document.
2. **Whether the scoring grid is included.** The Bewertungskriterien pages are the most
   valuable part — the official telc B1 band values (A=5/B=3/C=1/D=0, ×3 = 45) came from
   exactly those pages. Papers that include them let the rubrics be verified rather than
   approximated. A1, A2 and B1 are all `verified: true`, each transcribed from its own
   paper's *Informationen für Prüfende → Bewertung*.

   The A-levels look nothing like B1. Both telc *Start Deutsch 1* (A1) and *Start
   Deutsch 2* (A2) mark each Inhaltspunkt on its own — 3 / 1,5 / 0 — plus a single
   1 / 0,5 / 0 for kommunikative Gestaltung, maximum 10, with no formale-Richtigkeit
   criterion at all. A2 differs from A1 not in its grid, which is word-for-word the
   same, but in its task: four Punkte are printed and "Wählen Sie drei aus", so only
   three are marked and the skipped one costs nothing. Don't assume a lower level is
   a rescaled B1, or that two levels sharing a grid share a task — check the paper.

Record page hints in an `INDEX.md` inside the level folder if you like, or just say them in
chat when you point me at the files — both work.

## Why the files stay out of the repo

Published exam papers are copyrighted. They're fine to use privately as format
references, but seeding verbatim copies into a deployed database would redistribute
them. The seeded prompts in `prisma/seed.ts` therefore use **original stimulus letters
and topics written in the authentic exam format** — same structure, same register, same
Leitpunkt style, different content.

## What gets extracted from each paper

For a TELC B1 *Schriftlicher Ausdruck* (Brief) task, the structure is:

| Part | Example from a TELC B1 paper | Maps to `Prompt` field |
|---|---|---|
| Task intro | "Eine Bekannte hat Ihnen folgenden Brief geschrieben:" | `taskIntro` |
| Stimulus letter | The full incoming letter | `stimulusText` |
| Writer's name | "Rita" — needed so the reply can open "Liebe Rita" | `stimulusAuthor` |
| Instruction line | "Antworten Sie … Schreiben Sie etwas zu den folgenden vier Punkten:" | `instructions` |
| The four points | "Ihre neue Arbeitsstelle", "Wie man in Ihrem Land heiratet", … | `leitpunkte[]` |
| Register | Informal (`du`) vs formal (`Sie`) | `register` |
| Subject line required? | Whether a *Betreff* is asked for | `requiresSubject` |

The four **Leitpunkte** are stored as a list rather than prose because TELC grades
*Inhaltliche Vollständigkeit* by checking each point individually — the evaluator needs
them as discrete items to tick off.
