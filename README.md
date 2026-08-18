# Deutsch Essay Evaluator

Practise TELC German writing exams and get examiner-style feedback in seconds.

**[Try it live →](https://deutsch-essay-evaluator.vercel.app)**

![Choosing a TELC B1 writing task: the exam picker above, and a filterable list of tasks
below, each showing its Anlass, word range and register](public/screenshot-write.png)

Pick an exam level, write against a real exam-format task under the clock, and get back
inline grammar corrections, a per-criterion score using telc's own band descriptors, and a
short summary of what to fix. Sign in with Google — there is no sign-up step and no
password anywhere.

**Scope**: TELC, all four levels — A1, A2, B1 and B2 are seeded and selectable, 79 tasks
between them. The Goethe-Institut is stubbed in the UI ("Coming soon") and supported by the
data model, but has no rubric and no seeded tasks — see [src/lib/rubrics](src/lib/rubrics) for
how to add an institute.

## Things worth a look

- **Rubrics are data, not code paths** — [src/lib/rubrics](src/lib/rubrics). The levels
  differ structurally, not just numerically: A1 marks each Inhaltspunkt on its own (3 / 1,5
  / 0, max 10, no grammar criterion at all), while B1 grades three criteria in A/B/C/D bands
  worth 5/3/1/0 and multiplies by three. Adding a level or an institute touches no API
  route, no evaluation pipeline and no schema.
- **Rationing one shared free-tier API key** — [src/lib/rateLimit.ts](src/lib/rateLimit.ts).
  A per-user daily quota, a global daily ceiling, a per-minute burst gate, and tighter
  limits for accounts under 24 hours old. Claims are reserved through a row lock and an
  advisory lock, so simultaneous submissions cannot overshoot the ceiling —
  [scripts/check-reservation-concurrency.ts](scripts/check-reservation-concurrency.ts) fires
  real concurrent requests to prove it.
- **Timeouts that answer instead of failing** — [src/lib/gemini.ts](src/lib/gemini.ts). The
  evaluation runs on its own 50s budget beneath the platform's 60s limit, enforced by both
  an `AbortSignal` and a retry deadline. A slow model returns a real message naming the
  saved essay, rather than the bare gateway error the platform would produce by killing the
  function mid-request.
- **The examiner prompt is snapshot-tested** — [tests/snapshots](tests/snapshots). Every
  rubric change shows up as a readable diff of what the model is actually told, which is
  the part most likely to drift silently.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Prisma ORM + Postgres, using the Prisma 7 `prisma-client` generator (driver-adapter based —
  see `src/lib/prisma.ts`)
- Auth.js (NextAuth v5) with the Prisma adapter — Google sign-in only, JWT sessions. There is
  no sign-up step and no password anywhere: the first sign-in creates the account
- `@google/genai` for Gemini calls, with a per-user daily evaluation quota to protect the
  shared free-tier API key (see `src/lib/rateLimit.ts`)

## Local development

1. Copy `.env.example` to `.env` and fill in the values (see comments in that file).
2. Start a local Postgres database: `npx prisma dev` (prints a `DATABASE_URL`; put the printed
   TCP url in `.env` — see note below on `migrate dev` vs `db push`).
3. Push the schema and seed the TELC A1–B2 prompt bank:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
4. `npm run dev` and open http://localhost:3000.

### Note on migrations

`npx prisma dev`'s bundled local Postgres has flaky shadow-database support, which
`prisma migrate dev` needs — `prisma db push` works fine and is what local iteration uses.

`prisma/migrations` nevertheless holds a baseline, so production has a history to deploy.
It was generated from the schema rather than from a database:

```bash
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script \
  > prisma/migrations/<timestamp>_init/migration.sql
```

That is the same engine `migrate dev` uses; what it skips is executing the result, so the
first `prisma migrate deploy` against a real Postgres is where it is genuinely proven.
`migration_lock.toml` is hand-written for the same reason — `migrate dev` would have
created it.

Local and production are therefore managed differently, deliberately: keep using
`db push` locally, and let `migrate deploy` own production. A schema change needs the
same treatment as this one — push it locally, and add a migration for production with the
command above, using `--from-migrations prisma/migrations` as the `--from` so the diff
covers only what is new.

## Adding a new level or institute

Rubrics and prompts are data, not code paths:

1. Add a `LevelRubric` entry in `src/lib/rubrics/telc.ts` (or a new `goethe.ts` for the
   Goethe-Institut, registered in `src/lib/rubrics/index.ts`).
2. Add prompts for it in `prisma/seed.ts` and re-run `npx prisma db seed`.
3. Enable the level/institute button in `src/app/write/page.tsx` (`LEVELS`/`INSTITUTES`
   arrays).

No changes to the evaluation pipeline, API routes, or database schema are needed.

## Third-party content

The MIT licence below covers this project's own code. It cannot and does not extend to
telc's exam material, which belongs to telc gGmbH. This project is not affiliated with or
endorsed by telc.

What that means in practice, stated plainly rather than left to be discovered:

- **Exam papers are never committed.** `exam-materials/` is gitignored for PDFs and images
  alike, and nothing in it is deployed. It is a local reference folder — see
  [exam-materials/README.md](exam-materials/README.md).
- **Writing tasks: B1 and B2 are original.** Every stimulus letter and advertisement in
  `prisma/seed.ts`, `prisma/seed-telc-b1.ts` and `prisma/seed-telc-b2.ts` was written from
  a task's *situation* rather than from a paper's sentences. Names, towns, firms, prices
  and dates are invented. What they reuse is format, which is not expression.
- **Writing tasks: A1 and A2 are transcribed.** The 18 tasks in `prisma/seed-telc-a1.ts`
  and `prisma/seed-telc-a2.ts` keep their papers' titles, Situierungen and Punkte
  verbatim. Each is short — a title, a one-line situation and three or four bullets — but
  it is the papers' wording, and the file headers say so per task.
- **Rubrics quote the published assessment criteria.** `src/lib/rubrics/telc.ts` holds the
  band descriptors from telc's *Bewertungskriterien*, cited to the specific paper and
  edition at the top of that file. They are short functional phrases that the scoring
  cannot work without; the surrounding grids and guidance are this project's own.
- **The instruction blocks are the papers'.** They are identical boilerplate across every
  paper of a level and functional rather than creative, so they are reused as-is.

If you represent telc and want any of the above changed, please open an issue.

## Licence

MIT — see [LICENSE](LICENSE).
