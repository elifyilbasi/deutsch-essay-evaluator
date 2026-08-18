# Deutsch Essay Evaluator

Web app for German learners to write TELC/Goethe exam-style essays and get AI feedback
(grammar corrections, per-criterion scoring, and a summary) via Google Gemini.

**Scope**: TELC only, all four levels — A1, A2, B1 and B2 are seeded and selectable, 79 tasks
between them. The Goethe-Institut is stubbed in the UI ("Coming soon") and supported by the
data model, but has no rubric and no seeded tasks — see [src/lib/rubrics](src/lib/rubrics) for
how to add an institute.

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

## Licence

MIT — see [LICENSE](LICENSE).
