# Deutsch Essay Evaluator

Web app for German learners to write TELC/Goethe exam-style essays and get AI feedback
(grammar corrections, per-criterion scoring, and a summary) via Google Gemini.

**MVP scope**: TELC only, levels A1–B1. TELC B2 and the Goethe-Institut are stubbed in the UI
("Coming soon") and supported by the data model, but not yet seeded/enabled — see
[src/lib/rubrics](src/lib/rubrics) for how to add a level or institute.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Prisma ORM + Postgres, using the Prisma 7 `prisma-client` generator (driver-adapter based —
  see `src/lib/prisma.ts`)
- Auth.js (NextAuth v5) with the Prisma adapter, email+password (Credentials provider)
- `@google/genai` for Gemini calls, with a per-user daily evaluation quota to protect the
  shared free-tier API key (see `src/lib/rateLimit.ts`)

## Local development

1. Copy `.env.example` to `.env` and fill in the values (see comments in that file).
2. Start a local Postgres database: `npx prisma dev` (prints a `DATABASE_URL`; put the printed
   TCP url in `.env` — see note below on `migrate dev` vs `db push`).
3. Push the schema and seed the TELC A1/A2/B1 prompt bank:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
4. `npm run dev` and open http://localhost:3000.

### Note on migrations

`npx prisma dev`'s bundled local Postgres has flaky shadow-database support in this
environment, which `prisma migrate dev` needs — `prisma db push` works fine and is enough for
local iteration. Once you have a real Postgres available (e.g. Neon, see below), run
`npx prisma migrate dev --name init` against it once to generate a proper migration history
in `prisma/migrations`, then commit that folder and use `prisma migrate deploy` in production.

## Deploying to Vercel

1. Provision a Postgres database — Neon integrates natively with Vercel and has a free tier
   (Vercel dashboard → Storage → create a Postgres database). Use the **pooled** connection
   string (Neon's `-pooler` host) for `DATABASE_URL`. Every function instance opens its own
   pool, so what the database sees is instances × the pool size in `src/lib/prisma.ts`; the
   shared pooler is what keeps that from exhausting the connection limit under any real load.

2. Set these environment variables in the Vercel project.

   Required — the app will not start, or not let anyone in, without all five:

   | Variable | Notes |
   | --- | --- |
   | `DATABASE_URL` | The pooled string from step 1 |
   | `AUTH_SECRET` | `openssl rand -base64 32` — generate a fresh one, don't reuse the local value |
   | `AUTH_GOOGLE_ID` | Sign-in is Google-only, so this is not optional |
   | `AUTH_GOOGLE_SECRET` | ditto |
   | `GEMINI_API_KEY` | The shared key everything is rationed against |

   Rationing — every one of these means *no limit* when unset, so production is uncapped
   until they are set. `GLOBAL_DAILY_EVAL_LIMIT` is the one that actually protects the
   shared key: without it a single user can spend the whole day's free-tier allowance:

   | Variable | Unset means | Suggested |
   | --- | --- | --- |
   | `GLOBAL_DAILY_EVAL_LIMIT` | no ceiling across all users | `10` (see `.env.example`) |
   | `GEMINI_RPM_LIMIT` | no per-minute gate | match your model's RPM quota |
   | `NEW_ACCOUNT_DAILY_LIMIT` | new accounts unrestricted | a small shared pool |
   | `FIRST_DAY_EVAL_LIMIT` | new accounts get the ordinary quota | below `DAILY_EVAL_LIMIT` |

   Optional: `GEMINI_MODEL` (defaults to `gemini-flash-latest`) and `DAILY_EVAL_LIMIT`
   (defaults to `5`). See `.env.example` for the reasoning behind each.

3. Run `npx prisma migrate deploy` against the production `DATABASE_URL` (locally, or as a
   Vercel build step) before/at first deploy, then `npx prisma db seed` once to load the
   prompt bank.
4. Deploy. Sign-in is Google-only: there is no sign-up step, since the first sign-in
   creates the account. Add the production callback URL
   (`https://<your-domain>/api/auth/callback/google`) to the OAuth client, alongside the
   localhost one.

## Gemini free tier

Get a key at https://aistudio.google.com/apikey and set `GEMINI_API_KEY`. All users share this
one key; `DAILY_EVAL_LIMIT` (default 5) caps how many evaluations a single user can run per UTC
day so no one user can exhaust the shared free-tier quota.

## Adding a new level or institute

Rubrics and prompts are data, not code paths:

1. Add a `LevelRubric` entry in `src/lib/rubrics/telc.ts` (or a new `goethe.ts` for the
   Goethe-Institut, registered in `src/lib/rubrics/index.ts`).
2. Add prompts for it in `prisma/seed.ts` and re-run `npx prisma db seed`.
3. Enable the level/institute button in `src/app/write/page.tsx` (`LEVELS`/`INSTITUTES`
   arrays).

No changes to the evaluation pipeline, API routes, or database schema are needed.
